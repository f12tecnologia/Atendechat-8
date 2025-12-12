import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import path from "path";

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
          origin.includes('.replit.app')) {
        return callback(null, true);
      }
      
      // Allow any origin for now (can be restricted later)
      return callback(null, true);
    }
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());
app.use("/public", express.static(uploadConfig.directory));
app.use(routes);

// Serve frontend static files in production
if (process.env.NODE_ENV === "production") {
  const frontendBuildPath = path.join(__dirname, "..", "..", "frontend", "build");
  app.use(express.static(frontendBuildPath));
  
  // Handle React routing - serve index.html for all non-API routes
  app.get("*", (req: Request, res: Response) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api") || req.path.startsWith("/public")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(frontendBuildPath, "index.html"));
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
