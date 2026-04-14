'use strict';

/**
 * src/validators/analytics.validators.js
 *
 * Joi schemas for all analytics query parameters.
 * Every schema has safe defaults so the endpoints work with zero params.
 */

const Joi = require('joi');

const CATEGORIES = [
  'food', 'transport', 'utilities', 'entertainment',
  'health', 'shopping', 'education', 'travel', 'other',
];


const yearField = Joi.number()
  .integer().min(2000).max(2100)
  .default(() => new Date().getFullYear());

const monthField = Joi.number()
  .integer().min(1).max(12)
  .default(() => new Date().getMonth() + 1);

const monthsHistoryField = Joi.number()
  .integer().min(1).max(24)
  .default(3)
  .messages({ 'number.max': 'History window cannot exceed 24 months.' });


/** GET /api/analytics/summary */
const summaryQuerySchema = Joi.object({
  year:  yearField,
  month: monthField,
});

/** GET /api/analytics/trends */
const trendsQuerySchema = Joi.object({
  months: Joi.number().integer().min(1).max(24).default(6),
});

/** GET /api/analytics/top-expenses */
const topExpensesQuerySchema = Joi.object({
  k: Joi.number()
    .integer().min(1).max(50)
    .default(10)
    .messages({
      'number.min': 'k must be at least 1.',
      'number.max': 'k cannot exceed 50.',
    }),
  startDate: Joi.date().iso(),
  endDate:   Joi.date().iso().min(Joi.ref('startDate')).messages({
    'date.min': 'endDate must be on or after startDate.',
  }),
  category: Joi.string().valid(...CATEGORIES),
});

/** GET /api/analytics/suggestions */
const suggestionsQuerySchema = Joi.object({
  year:          yearField,
  month:         monthField,
  months:        monthsHistoryField,
  targetPercent: Joi.number()
    .min(1).max(80)
    .default(20)
    .messages({
      'number.min': 'Target saving must be at least 1%.',
      'number.max': 'Target saving cannot exceed 80% of spend.',
    }),
});

/** GET /api/analytics/savings-plan */
const savingsPlanQuerySchema = Joi.object({
  goalAmount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Goal amount must be a positive number.',
      'any.required':    'goalAmount is required.',
    }),
  year:      yearField,
  month:     monthField,
  months:    monthsHistoryField,
  maxPlans:  Joi.number().integer().min(1).max(10).default(5),
});

module.exports = {
  summaryQuerySchema,
  trendsQuerySchema,
  topExpensesQuerySchema,
  suggestionsQuerySchema,
  savingsPlanQuerySchema,
};
