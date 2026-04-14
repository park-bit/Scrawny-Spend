'use strict';

/**
 * src/models/Anomaly.js
 *
 * Written by the anomaly detection service after each
 * Isolation Forest inference run. Unresolved anomalies
 * are surfaced in the AI Insights panel.
 */

const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
      required: true,
    },
    // Isolation Forest contamination score (higher = more anomalous)
    score: {
      type: Number,
      required: true,
    },
    // Human-readable explanation generated server-side
    // e.g. "3× higher than your average food spend this month"
    reason: {
      type: String,
      required: true,
    },
    // null = unresolved; set when user dismisses the alert
    resolvedAt: {
      type: Date,
      default: null,
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

anomalySchema.index({ userId: 1, resolvedAt: 1 });
anomalySchema.index({ expenseId: 1 }, { unique: true });

module.exports = mongoose.model('Anomaly', anomalySchema);
