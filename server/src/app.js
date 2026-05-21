import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middlewares/error.middleware.js';
import { logger } from './config/logger.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

// ==========================================
// 🛡️ Security Middlewares
// ==========================================
// 1. Helmet headers protection
app.use(helmet());

// 2. CORS configuration (allowing client credentials access)
app.use(
  cors({
    origin: true, // Echo origin to allow credentials from any local client port
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. API rate limiting (to prevent kiosk attacks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many requests from this IP, please try again later'));
  },
});
app.use('/api/', limiter);

// ==========================================
// 📦 Parsing & Logging Middlewares
// ==========================================
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());

// Morgan HTTP request logging mapped to Winston system logger
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// ==========================================
// 📁 Sandbox Directories
// ==========================================
// Serve sandbox downloaded files (static sandboxed files)
app.use('/temp/downloads', express.static('temp/downloads'));

// ==========================================
// 🗺️ Routing System
// ==========================================
// Define base fallback route to verify API health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Central Router hook (lazy import when defined)
import { router as apiRouter } from './routes/index.js';
app.use('/api/v1', apiRouter);

// ==========================================
// 🚨 Error Handlers
// ==========================================
// 404 Route handler
app.use('*', (req, res, next) => {
  next(new ApiError(404, `Endpoint ${req.originalUrl} not found on this server`));
});

// Central error handler middleware
app.use(errorHandler);

export { app };
