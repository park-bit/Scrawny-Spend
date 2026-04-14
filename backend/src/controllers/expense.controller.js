'use strict';

/**
 * src/controllers/expense.controller.js
 *
 * Thin HTTP layer – delegates all logic to expenseService.
 * Validation is handled upstream in the route via the validate() middleware,
 * so req.body / req.query / req.params arrive here already sanitised.
 */

const expenseService  = require('../services/expenseService');
const { sendSuccess } = require('../utils/responseHelper');

// GET /api/expenses

/**
 * List all expenses for the authenticated user.
 * Supports filtering, sorting, and pagination via query params.
 *
 * Query params (all optional):
 *   category, paymentMethod, startDate, endDate,
 *   minAmount, maxAmount, search, isAnomaly,
 *   sortBy, sortOrder, page, limit
 *
 * Response 200:
 *   { data: Expense[], meta: { total, page, limit, totalPages, hasNextPage } }
 */
const getAll = async (req, res, next) => {
  try {
    const { data, meta } = await expenseService.getAll(req.user.id, req.query);
    return sendSuccess(res, data, 'Expenses retrieved.', 200, meta);
  } catch (err) {
    return next(err);
  }
};

// POST /api/expenses

/**
 * Create a new expense for the authenticated user.
 *
 * Request body (validated by createExpenseSchema):
 *   { amount, description, category?, date?, paymentMethod?, tags?, receiptUrl? }
 *
 * Response 201:
 *   { expense }
 */
const create = async (req, res, next) => {
  try {
    const expense = await expenseService.create(req.user.id, req.body);
    return sendSuccess(res, { expense }, 'Expense created.', 201);
  } catch (err) {
    return next(err);
  }
};

// GET /api/expenses/summary

/**
 * Category-level spend summary for a given month.
 * Must be defined BEFORE /:id to avoid Express matching "summary" as an ID.
 *
 * Query params (both optional, default to current month):
 *   year, month
 *
 * Response 200:
 *   { year, month, grandTotal, byCategory: [{ category, total, count }] }
 */
const getSummary = async (req, res, next) => {
  try {
    const summary = await expenseService.getSummary(req.user.id, req.query);
    return sendSuccess(res, summary, 'Summary retrieved.');
  } catch (err) {
    return next(err);
  }
};

// GET /api/expenses/trends

/**
 * Monthly spend totals for the last N months (trend chart data).
 * Must be defined BEFORE /:id to avoid Express matching "trends" as an ID.
 *
 * Query params:
 *   months (default 6, max 24)
 *
 * Response 200:
 *   [{ year, month, total, count }]
 */
const getTrends = async (req, res, next) => {
  try {
    const trends = await expenseService.getTrends(req.user.id, req.query);
    return sendSuccess(res, trends, 'Trends retrieved.');
  } catch (err) {
    return next(err);
  }
};

// GET /api/expenses/:id

/**
 * Fetch a single expense by ID.
 * Returns 404 if the expense does not exist or belongs to another user.
 *
 * Response 200:
 *   { expense }
 */
const getOne = async (req, res, next) => {
  try {
    const expense = await expenseService.getOne(req.user.id, req.params.id);
    return sendSuccess(res, { expense }, 'Expense retrieved.');
  } catch (err) {
    return next(err);
  }
};

// PUT /api/expenses/:id

/**
 * Update an expense (partial update – only sent fields are changed).
 * Budget counters are re-synced automatically if financial fields change.
 *
 * Request body (validated by updateExpenseSchema):
 *   Any subset of { amount, description, category, date, paymentMethod, tags, receiptUrl }
 *   At least one field must be present.
 *
 * Response 200:
 *   { expense }
 */
const update = async (req, res, next) => {
  try {
    const expense = await expenseService.update(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { expense }, 'Expense updated.');
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/expenses/:id

/**
 * Delete an expense and reverse its budget contribution.
 *
 * Response 200:
 *   null
 */
const remove = async (req, res, next) => {
  try {
    await expenseService.remove(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Expense deleted.');
  } catch (err) {
    return next(err);
  }
};

module.exports = { getAll, create, getOne, update, remove, getSummary, getTrends };
