'use strict';

/**
 * src/app.js
 *
 * Express application factory.
 *
 * Responsibilities:
 *   1. Global security middleware (Helmet, CORS)
 *   2. Request parsing + logging
 *   3. Rate limiting
 *   4. Route mounting
 *   5. 404 catch-all
 *   6. Centralised error handler
 *
 * server.js imports this file and calls app.listen()
 * so the app itself stays testable without binding a port.
 */

require('dotenv').config();

const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const morgan   = require('morgan');

const env            = require('./config/env');
const logger         = require('./utils/logger');
const { sendError }  = require('./utils/responseHelper');
const { defaultLimiter } = require('./middleware/rateLimiter');
const errorHandler   = require('./middleware/errorHandler');

const authRoutes    = require('./routes/auth.routes');
const expenseRoutes = require('./routes/expense.routes');
const budgetRoutes  = require('./routes/budget.routes');
const aiRoutes      = require('./routes/ai.routes');
const reportRoutes    = require('./routes/report.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (env.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // pre-flight for all routes

app.use(express.json({ limit: '10kb' }));        // reject oversized payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Use 'combined' in production for full Apache-style logs;
// 'dev' in development for colourised short output.
const morganFormat = env.isDev ? 'dev' : 'combined';
app.use(
  morgan(morganFormat, {
    stream: { write: (msg) => logger.http(msg.trim()) },
    // Skip health-check pings from Render's uptime monitor
    skip: (req) => req.url === '/health',
  })
);

app.use('/api', defaultLimiter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth',     authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets',  budgetRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/analytics',  analyticsRoutes);

app.use((req, res) => {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found.`, 404, 'NOT_FOUND');
});

app.use(errorHandler);

module.exports = app;