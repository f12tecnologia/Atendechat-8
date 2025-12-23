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

// CORS configuration - allow all origins
app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      // Allow all origins
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.use("/public", express.static(uploadConfig.directory));

// Serve frontend build if it exists
const frontendBuildPath = path.join(__dirname, "..", "..", "frontend", "build");
if (fs.existsSync(frontendBuildPath)) {
  logger.info("Serving frontend from: " + frontendBuildPath);
  app.use(express.static(frontendBuildPath));
}

// Health check route
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use(routes);

// Catch-all route to serve frontend index.html for client-side routing
app.get("*", (req: Request, res: Response) => {
  // Skip API routes
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
    return res.status(404).json({ error: "Not found" });
  }

  const frontendBuildPath = path.join(__dirname, "..", "..", "frontend", "build");
  const indexPath = path.join(frontendBuildPath, "index.html");

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "Frontend not built. Run: cd frontend && npm run build" });
  }
});

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