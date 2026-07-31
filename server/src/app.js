import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';

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
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // limit raised to prevent kiosk polling rate exhaust blocking local development/operation
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new ApiError(429, 'Too many requests from this IP, please try again later'));
    },
  });
  app.use('/api/', limiter);
} else {
  logger.info('Rate limiting is disabled in development mode');
}

// ==========================================
// 📦 Parsing & Logging Middlewares
// ==========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Morgan HTTP request logging mapped to Winston system logger
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(
  morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms', {
    stream: morganStream,
    skip: (req) => req.originalUrl && (req.originalUrl.includes('/admin/logs') || req.originalUrl.includes('/admin/metrics')),
  })
);

// ==========================================
// 📁 Sandbox Directories
// ==========================================
// Custom middleware to serve files with Cloudinary fallback proxying
const serveWithCloudinaryFallback = (subFolder, cloudinaryFolder) => {
  return async (req, res, next) => {
    // req.params[0] contains the wildcard path, e.g. "v123/kiosk_scans/file.pdf" or "file.pdf"
    const wildcardPath = req.params[0] || '';
    
    // Extract raw filename for local checks and download naming
    const filename = path.basename(wildcardPath);
    const localPath = path.resolve(`temp/${subFolder}`, filename);

    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    // Fallback to Cloudinary if configured (proxy file bytes directly)
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      let cloudinaryUrl;
      if (wildcardPath.includes('/')) {
        // Reconstruct exact Cloudinary URL containing version and subfolder hierarchy
        cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${wildcardPath}`;
      } else {
        // Fallback default folder structure
        cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${cloudinaryFolder}/${wildcardPath}`;
      }
      
      logger.info(`☁️ [FALLBACK PROXY]: File ${filename} not found locally in temp/${subFolder}. Proxying from Cloudinary: ${cloudinaryUrl}`);
      
      try {
        const response = await fetch(cloudinaryUrl);
        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'application/pdf';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
          
          const arrayBuffer = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        } else {
          logger.error(`⚠️ [FALLBACK PROXY ERROR]: Cloudinary returned status ${response.status} for ${cloudinaryUrl}`);
        }
      } catch (err) {
        logger.error(`⚠️ [FALLBACK PROXY ERROR]: Failed to proxy from Cloudinary: ${err.message}`);
      }
    }

    return res.status(404).send('File not found');
  };
};

// Serve sandbox downloaded files (static sandboxed files with Cloudinary fallback redirection)
app.get('/temp/downloads/*', serveWithCloudinaryFallback('downloads', 'kiosk_downloads'));
app.get('/temp/scans/*', serveWithCloudinaryFallback('scans', 'kiosk_scans'));

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
