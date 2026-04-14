'use strict';

/**
 * src/config/env.js
 *
 * Single source of truth for all environment variables.
 * Fails fast on startup if required values are missing,
 * so misconfiguration surfaces immediately instead of at
 * runtime in a live request.
 */

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return value;
};

const optional = (key, defaultValue) => process.env[key] ?? defaultValue;

const env = {
    NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  isDev: optional('NODE_ENV', 'development') === 'development',
  isProd: optional('NODE_ENV', 'development') === 'production',

    MONGODB_URI: required('MONGODB_URI'),

    JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '30d'),

    ALLOWED_ORIGINS: optional('ALLOWED_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),

    AI_ENGINE_URL: optional('AI_ENGINE_URL', 'http://localhost:8000'),
  AI_ENGINE_SECRET: optional('AI_ENGINE_SECRET', ''),

    RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),

    LOG_LEVEL: optional('LOG_LEVEL', 'info'),

  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
};

module.exports = env;
