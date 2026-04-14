'use strict';

/**
 * src/middleware/errorHandler.js
 *
 * Global error handling middleware.  Must be the LAST middleware
 * registered in app.js (Express requires exactly 4 arguments).
 *
 * Handles:
 *   - AppError (operational, thrown deliberately)
 *   - Mongoose ValidationError
 *   - Mongoose CastError  (invalid ObjectId)
 *   - Mongoose duplicate key (code 11000)
 *   - JWT errors
 *   - Catch-all for unexpected bugs
 */

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const env = require('../config/env');


const handleMongooseValidation = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation failed: ${messages.join('. ')}`, 422, 'VALIDATION_ERROR');
};

const handleMongooseCast = (err) =>
  new AppError(`Invalid value for field '${err.path}': ${err.value}`, 400, 'INVALID_ID');

const handleMongoDuplicate = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`'${err.keyValue[field]}' is already taken for field '${field}'.`, 409, 'DUPLICATE_KEY');
};

const handleJwtInvalid = () =>
  new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');

const handleJwtExpired = () =>
  new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');


// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert known library errors
  if (err.name === 'ValidationError') error = handleMongooseValidation(err);
  else if (err.name === 'CastError') error = handleMongooseCast(err);
  else if (err.code === 11000) error = handleMongoDuplicate(err);
  else if (err.name === 'JsonWebTokenError') error = handleJwtInvalid();
  else if (err.name === 'TokenExpiredError') error = handleJwtExpired();

  // Default to 500 for unrecognised errors
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message =
    error.isOperational
      ? error.message
      : 'Something went wrong. Please try again later.';

  // Always log the full error server-side
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} → ${err.message}`, {
      stack: err.stack,
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${message}`);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      // Only expose stack trace in development
      ...(env.isDev && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
