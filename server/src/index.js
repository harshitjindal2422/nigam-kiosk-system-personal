import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { app } from './app.js';
import { prisma } from './config/db.js';
import { logger } from './config/logger.js';
import { initSocketServer } from './socket.js';

// 1. Load environment configurations
dotenv.config();

const PORT = process.env.PORT || 5000;

// 2. Ensure sandboxed temporary files folder exists
const TEMP_DOWNLOAD_DIR = path.resolve('temp/downloads');
if (!fs.existsSync(TEMP_DOWNLOAD_DIR)) {
  fs.mkdirSync(TEMP_DOWNLOAD_DIR, { recursive: true });
  logger.info(`📁 Created temporary downloaded files directory at: ${TEMP_DOWNLOAD_DIR}`);
}

// Function to clean up sandboxed downloaded files older than 3 days
function cleanupSandboxedFiles() {
  try {
    const files = fs.readdirSync(TEMP_DOWNLOAD_DIR);
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      if (file === '.gitkeep') return;
      
      const filePath = path.join(TEMP_DOWNLOAD_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > threeDaysMs) {
        fs.unlinkSync(filePath);
        logger.info(`🗑️ [SANDBOX CLEANUP]: Automatically purged old downloaded file ${file} (older than 3 days).`);
      }
    });
  } catch (error) {
    logger.error('⚠️ [SANDBOX CLEANUP]: Error running background cleanup:', error);
  }
}

// Execute cleanup immediately on startup and run hourly in the background
cleanupSandboxedFiles();
setInterval(cleanupSandboxedFiles, 60 * 60 * 1000);

// 3. Connect to database & start server
let server;

async function bootstrap() {
  try {
    logger.info('🔌 Connecting to PostgreSQL database via Prisma...');
    await prisma.$connect();
    logger.info('✅ Database connection established successfully!');

    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`🎯 API Base: http://localhost:${PORT}/api/v1`);
    });
    
    initSocketServer(server);
  } catch (error) {
    logger.error('❌ Failed to bootstrap the server due to database connection error:', error);
    process.exit(1);
  }
}

bootstrap();

// ==========================================
// 🛡️ Graceful Shutdown & Process Safeguards
// ==========================================
const exitHandler = () => {
  if (server) {
    logger.info('🛑 Shutting down HTTP server gracefully...');
    server.close(async () => {
      logger.info('✅ HTTP server closed.');
      await prisma.$disconnect();
      logger.info('🔌 Database connection closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error('🚨 Unexpected process error trapped:', error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('📥 SIGTERM signal received.');
  exitHandler();
});

process.on('SIGINT', () => {
  logger.info('📥 SIGINT (Ctrl+C) signal received.');
  exitHandler();
});
