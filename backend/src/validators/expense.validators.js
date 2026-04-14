'use strict';

const Joi = require('joi');
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES, PAYMENT_METHODS } = require('../models/Expense');

const SORT_FIELDS = ['date', 'amount', 'category', 'createdAt'];
const SORT_ORDERS = ['asc', 'desc'];
const TYPES       = ['expense', 'income'];


const amountField = Joi.number().positive().precision(2).max(10_000_000).required()
  .messages({
    'number.base':      'Amount must be a number.',
    'number.positive':  'Amount must be greater than 0.',
    'any.required':     'Amount is required.',
  });

const descriptionField = Joi.string().trim().min(2).max(200).required()
  .messages({
    'string.min':   'Description must be at least 2 characters.',
    'any.required': 'Description is required.',
  });

const dateField = Joi.date().iso().max('now').default(() => new Date())
  .messages({
    'date.base': 'Date must be a valid ISO date string.',
    'date.max':  'Date cannot be in the future.',
  });

const tagsField = Joi.array().items(Joi.string().trim().max(30)).max(10).default([]);


/** POST /api/expenses  (handles both expense and income) */
const createExpenseSchema = Joi.object({
  type:          Joi.string().valid(...TYPES).default('expense'),
  amount:        amountField,
  description:   descriptionField,
  category:      Joi.string().valid(...ALL_CATEGORIES).default('other'),
  date:          dateField,
  paymentMethod: Joi.string().valid(...PAYMENT_METHODS).default('cash'),
  tags:          tagsField,
  receiptUrl:    Joi.string().uri().allow(null, '').default(null),
});

/** PUT /api/expenses/:id */
const updateExpenseSchema = Joi.object({
  type:          Joi.string().valid(...TYPES),
  amount:        Joi.number().positive().precision(2).max(10_000_000),
  description:   Joi.string().trim().min(2).max(200),
  category:      Joi.string().valid(...ALL_CATEGORIES),
  date:          Joi.date().iso().max('now'),
  paymentMethod: Joi.string().valid(...PAYMENT_METHODS),
  tags:          tagsField,
  receiptUrl:    Joi.string().uri().allow(null, ''),
}).min(1).messages({ 'object.min': 'At least one field must be provided.' });

/** GET /api/expenses */
const listExpensesSchema = Joi.object({
  type:          Joi.string().valid(...TYPES),           // filter by income/expense
  category:      Joi.string().valid(...ALL_CATEGORIES),
  paymentMethod: Joi.string().valid(...PAYMENT_METHODS),
  startDate:     Joi.date().iso(),
  endDate:       Joi.date().iso().min(Joi.ref('startDate')),
  minAmount:     Joi.number().positive(),
  maxAmount:     Joi.number().positive(),
  search:        Joi.string().trim().max(100),
  isAnomaly:     Joi.boolean(),
  sortBy:        Joi.string().valid(...SORT_FIELDS).default('date'),
  sortOrder:     Joi.string().valid(...SORT_ORDERS).default('desc'),
  page:          Joi.number().integer().min(1).default(1),
  limit:         Joi.number().integer().min(1).max(100).default(20),
});

/** GET /api/expenses/summary */
const summaryQuerySchema = Joi.object({
  year:  Joi.number().integer().min(2000).max(2100).default(() => new Date().getFullYear()),
  month: Joi.number().integer().min(1).max(12).default(() => new Date().getMonth() + 1),
});

/** GET /api/expenses/trends */
const trendsQuerySchema = Joi.object({
  months: Joi.number().integer().min(1).max(24).default(6),
});

/** Params: /:id */
const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^[a-f\d]{24}$/i).required()
    .messages({ 'string.pattern.base': 'Invalid ID format.' }),
});

module.exports = {
  createExpenseSchema, updateExpenseSchema, listExpensesSchema,
  summaryQuerySchema,  trendsQuerySchema,   idParamSchema,
};
