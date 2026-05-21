import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// 1. Standard visual log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// 2. Base directory for logs
const LOGS_DIR = path.resolve('logs');

// 3. Helper to create a daily rotating file transport
const createRotateTransport = (filename, level = 'info') => {
  return new winston.transports.DailyRotateFile({
    dirname: LOGS_DIR,
    filename: `${filename}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level,
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  });
};

// 4. Winston Loggers setup
winston.loggers.add('system', {
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        printf(({ level, message, timestamp, stack }) => `${timestamp} [${level}]: ${stack || message}`)
      ),
    }),
    createRotateTransport('system', 'info'),
    createRotateTransport('errors', 'error'),
  ],
});

winston.loggers.add('payments', {
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), printf(({ message }) => `💳 [PAYMENT] ${message}`)),
    }),
    createRotateTransport('payments', 'info'),
  ],
});

winston.loggers.add('printers', {
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), printf(({ message }) => `🖨️ [PRINTER] ${message}`)),
    }),
    createRotateTransport('printers', 'info'),
  ],
});

winston.loggers.add('sessions', {
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), printf(({ message }) => `🖥️ [SESSION] ${message}`)),
    }),
    createRotateTransport('sessions', 'info'),
  ],
});

// Export dedicated loggers
export const logger = winston.loggers.get('system');
export const paymentLogger = winston.loggers.get('payments');
export const printerLogger = winston.loggers.get('printers');
export const sessionLogger = winston.loggers.get('sessions');
