'use strict';

/**
 * src/middleware/rateLimiter.js
 *
 * Two limiters exported:
 *
 *   defaultLimiter  – applied globally (100 req / 15 min)
 *   authLimiter     – stricter limiter on auth routes (10 req / 15 min)
 *                     protects against brute-force attacks.
 *
 * Values come from env so they can be tuned per environment
 * without touching code.
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { sendError } = require('../utils/responseHelper');

const rateLimitHandler = (req, res) =>
  sendError(
    res,
    'Too many requests from this IP. Please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED'
  );

const defaultLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,        // 15 minutes
  max: env.RATE_LIMIT_MAX_REQUESTS,           // 100 requests
  standardHeaders: true,                      // Return RateLimit-* headers
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 10,                                    // 10 login/register attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = { defaultLimiter, authLimiter };
