'use strict';

/**
 * src/config/db.js
 *
 * Mongoose connection manager.
 * - Connects to MongoDB Atlas with clean options.
 * - Emits lifecycle events to the logger.
 * - Provides a graceful disconnect helper used by the
 *   server shutdown handler.
 */

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

const MONGOOSE_OPTIONS = {
  // Atlas free tier works fine with these defaults.
  // Add maxPoolSize if you scale beyond free tier.
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
};

/**
 * Establish the Mongoose connection.
 * Throws if the URI is unreachable so the server
 * refuses to start rather than serving broken requests.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
    logger.info(`MongoDB connected → ${conn.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    // Exit with failure code – Render/PM2 will restart the process.
    process.exit(1);
  }
};

/**
 * Gracefully close the Mongoose connection.
 * Called during SIGTERM / SIGINT shutdown.
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
  } catch (err) {
    logger.error(`Error closing MongoDB connection: ${err.message}`);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Mongoose will auto-retry.');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected.');
});

module.exports = { connectDB, disconnectDB };
