'use strict';

/**
 * src/models/Budget.js
 */

const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // "2025-04" – YYYY-MM format for easy querying
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    limit: {
      type: Number,
      required: [true, 'Budget limit is required'],
      min: [1, 'Limit must be greater than 0'],
    },
    // Denormalised for fast status checks – updated on each expense write
    spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Alert fires when spent / limit >= alertThreshold (e.g. 0.8 = 80%)
    alertThreshold: {
      type: Number,
      default: 0.8,
      min: 0.1,
      max: 1.0,
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

// Virtual: remaining budget
budgetSchema.virtual('remaining').get(function () {
  return Math.max(0, this.limit - this.spent);
});

// Virtual: percentage used
budgetSchema.virtual('usagePercent').get(function () {
  return this.limit > 0 ? Math.min(1, this.spent / this.limit) : 0;
});

// Enforce one budget per user per category per month
budgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
