'use strict';

const mongoose = require('mongoose');

// Expense-only categories (what users spend money on)
const EXPENSE_CATEGORIES = [
  'food', 'transport', 'utilities', 'entertainment',
  'health', 'shopping', 'education', 'travel', 'other',
];

// Income source categories
const INCOME_CATEGORIES = [
  'salary', 'freelance', 'business', 'investment', 'gift', 'other_income',
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'netbanking', 'wallet'];

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 'expense' (default) | 'income'
    type: {
      type: String,
      enum: ['expense', 'income'],
      default: 'expense',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [200, 'Description must be 200 characters or fewer'],
    },
    category: {
      type: String,
      enum: ALL_CATEGORIES,
      default: 'other',
    },
    categoryConfidence: { type: Number, min: 0, max: 1, default: null },
    aiClassified:       { type: Boolean, default: false },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'cash',
    },
    tags:        { type: [String], default: [] },
    receiptUrl:  { type: String, default: null },
    isAnomaly:   { type: Boolean, default: false },
    anomalyScore:{ type: Number, default: null },
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

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, type: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });
expenseSchema.index({ userId: 1, date: -1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
module.exports.INCOME_CATEGORIES  = INCOME_CATEGORIES;
module.exports.ALL_CATEGORIES     = ALL_CATEGORIES;
module.exports.PAYMENT_METHODS    = PAYMENT_METHODS;
