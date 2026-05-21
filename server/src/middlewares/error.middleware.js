import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // 1. Convert non-ApiError exceptions to structured ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, err.errors || [], err.stack);
  }

  // 2. Log stack traces via Winston system logger
  logger.error(`[API ERROR] Path: ${req.originalUrl} | Code: ${error.statusCode} | Msg: ${error.message}`, {
    stack: error.stack,
  });

  // 3. Format unified JSON response
  const response = {
    success: false,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};
