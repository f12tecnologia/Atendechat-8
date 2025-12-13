import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import path from "path";
import fs from "fs";

import "./database";
import uploadConfig from "./config/upload";
import AppError from "./errors/AppError";
import routes from "./routes";
import { logger } from "./utils/logger";
import { messageQueue, sendScheduledMessages } from "./queues";
import bodyParser from 'body-parser';

Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

app.set("queues", {
  messageQueue,
  sendScheduledMessages
});

const bodyparser = require('body-parser');
app.use(bodyParser.json({ limit: '10mb' }));

// Dynamic CORS configuration for production
const corsOrigins = [
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
  "https://mychat.dreamsparkshow.com.br",
  "https://mychat.intelfoz.app.br",
  "http://mychat.intelfoz.app.br",
  "http://localhost:5000",
  "http://localhost:3000"
].filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list or matches Replit domains
      if (corsOrigins.some(allowed => origin.includes(allowed as string)) || 
          origin.includes('.replit.dev') || 
          origin.includes('.replit.app') ||
          origin.includes('localhost')) {
        return callback(null, true);
      }
      
      // Allow any origin for now (can be restricted later)
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());
app.use("/public", express.static(uploadConfig.directory));

// Serve frontend static files BEFORE API routes
const frontendBuildPath = path.join(__dirname, "..", "..", "frontend", "build");
if (fs.existsSync(frontendBuildPath)) {
  // Serve static assets (js, css, images, etc)
  app.use(express.static(frontendBuildPath));
  
  // Middleware to serve index.html for browser navigation BEFORE API routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip API endpoints - these are handled by routes
    // Known API endpoints that need to pass through
    const apiPaths = [
      '/auth', '/users', '/tickets', '/contacts', '/messages', '/settings',
      '/whatsapp', '/queues', '/quickAnswers', '/tags', '/schedules',
      '/companies', '/plans', '/helps', '/files', '/announcements',
      '/campaigns', '/contactLists', '/dashboard', '/subscriptions',
      '/invoices', '/flows', '/flowbuilder', '/versions', '/prompts',
      '/queueIntegrations', '/api-integrations', '/webhook', '/socket.io'
    ];
    
    // Check if path starts with any known API path
    const isApiRequest = apiPaths.some(apiPath => req.path.startsWith(apiPath));
    
    if (isApiRequest) {
      return next();
    }
    
    // For non-API routes, check if it's a browser navigation request
    const acceptHeader = req.headers.accept || "";
    if (acceptHeader.includes("text/html") && req.method === "GET") {
      return res.sendFile(path.join(frontendBuildPath, "index.html"));
    }
    
    next();
  });
}

// API routes
app.use(routes);

// Fallback for unmatched routes in production - serve frontend
if (process.env.NODE_ENV === "production") {
  app.get("*", (req: Request, res: Response) => {
    if (fs.existsSync(frontendBuildPath)) {
      res.sendFile(path.join(frontendBuildPath, "index.html"));
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });
}

app.use(Sentry.Handlers.errorHandler());

app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {

  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);
  return res.status(500).json({ error: "ERR_INTERNAL_SERVER_ERROR" });
});

export default app;
