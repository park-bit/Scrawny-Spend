'use strict';

/**
 * src/models/Prediction.js
 *
 * Stores ANN model output for a user's predicted spend
 * in a future month. Generated nightly by a cron job.
 */

const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The month being predicted, e.g. "2025-05"
    targetMonth: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'targetMonth must be in YYYY-MM format'],
    },
    predictedTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    // Breakdown by category: { food: 1200, transport: 450, ... }
    predictedByCategory: {
      type: Map,
      of: Number,
      default: {},
    },
    // Semver string to track which model version produced this
    modelVersion: {
      type: String,
      default: '1.0.0',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Only keep the latest prediction per user per month
predictionSchema.index({ userId: 1, targetMonth: 1 }, { unique: true });

module.exports = mongoose.model('Prediction', predictionSchema);
