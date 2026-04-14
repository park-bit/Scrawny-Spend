'use strict';

/**
 * server.js
 *
 * Entry point for the Smart Expense Tracker API.
 *
 * Responsibilities:
 *   1. Load environment variables
 *   2. Connect to MongoDB Atlas
 *   3. Start the HTTP server
 *   4. Handle unhandled promise rejections + uncaught exceptions
 *   5. Graceful shutdown on SIGTERM / SIGINT
 *      (Render sends SIGTERM before recycling a dyno)
 */

require('dotenv').config();

const env                    = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const logger                 = require('./src/utils/logger');
const app                    = require('./src/app');

// Boot sequence
const start = async () => {
  // 1. Connect to MongoDB Atlas before accepting traffic
  await connectDB();

  // 2. Bind the HTTP server
  const server = app.listen(env.PORT, () => {
    logger.info(
      `🚀 API running in ${env.NODE_ENV} mode on port ${env.PORT}`
    );
  });

    const shutdown = async (signal) => {
    logger.info(`${signal} received – shutting down gracefully…`);

    // Stop accepting new connections
    server.close(async () => {
      await disconnectDB();
      logger.info('Server closed. Goodbye.');
      process.exit(0);
    });

    // Force exit if cleanup takes too long (Render allows ~10 s)
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 9_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

// Safety nets – catch anything that slips through

// Unhandled promise rejection (e.g. a forgotten await)
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  // Let the process manager restart cleanly
  process.exit(1);
});

// Synchronous throw outside of any try/catch
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

start();
