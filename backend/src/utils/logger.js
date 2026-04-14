'use strict';

/**
 * src/utils/logger.js
 *
 * Centralised Winston logger.
 * - Development: colourised console output.
 * - Production:  structured JSON (easy to pipe into
 *   Render log drains or Datadog).
 */

const { createLogger, format, transports } = require('winston');
const env = require('../config/env');

const { combine, timestamp, printf, colorize, json, errors } = format;

// Human-readable format used in development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    stack
      ? `${ts} [${level}]: ${message}\n${stack}`
      : `${ts} [${level}]: ${message}`
  )
);

// Structured JSON format used in production
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const logger = createLogger({
  level: env.LOG_LEVEL,
  format: env.isDev ? devFormat : prodFormat,
  transports: [new transports.Console()],
  // Do not exit on handled exceptions
  exitOnError: false,
});

module.exports = logger;
