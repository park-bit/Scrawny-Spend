'use strict';

/**
 * src/utils/AppError.js
 *
 * Operational error class.  Throwing an AppError from anywhere
 * in the service/controller layer is caught by the global
 * error handler and converted to the correct HTTP response.
 *
 * Usage:
 *   throw new AppError('Expense not found', 404, 'NOT_FOUND');
 */

class AppError extends Error {
  /**
   * @param {string} message     - Human-readable description
   * @param {number} statusCode  - HTTP status code
   * @param {string} [code]      - Machine-readable error identifier
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distinguishes from unexpected bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
