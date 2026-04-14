'use strict';

/**
 * src/services/budgetService.js
 *
 * Budget CRUD + status summary.
 *
 *  getAll()    – list budgets for the current month (or requested month)
 *  create()    – set a budget limit for a category/month
 *  update()    – change limit or alertThreshold
 *  remove()    – delete a budget entry
 *  getStatus() – per-category budget vs actual spending for a month
 */

const mongoose = require('mongoose');
const Budget   = require('../models/Budget');
const Expense  = require('../models/Expense');
const AppError = require('../utils/AppError');
const { EXPENSE_CATEGORIES } = require('../models/Expense');

const r2 = (n) => Math.round(n * 100) / 100;

/** Format Date → "YYYY-MM" budget month key. */
const toMonthKey = (year, month) =>
  `${year}-${String(month).padStart(2, '0')}`;

/** Current YYYY-MM */
const currentMonthKey = () => {
  const n = new Date();
  return toMonthKey(n.getFullYear(), n.getMonth() + 1);
};

/**
 * List all budgets for a user in the given month.
 * Defaults to current month.
 */
const getAll = async (userId, { year, month } = {}) => {
  const now  = new Date();
  const y    = year  ?? now.getFullYear();
  const m    = month ?? (now.getMonth() + 1);
  const key  = toMonthKey(y, m);

  return Budget.find({ userId, month: key }).lean();
};

/**
 * Create or update a budget for a category in a month.
 * Uses upsert so calling twice is safe.
 */
const create = async (userId, { category, limit, month, alertThreshold }) => {
  if (!EXPENSE_CATEGORIES.includes(category))
    throw new AppError(`Invalid category: ${category}`, 400, 'INVALID_CATEGORY');

  const key = month ?? currentMonthKey();

  const budget = await Budget.findOneAndUpdate(
    { userId, category, month: key },
    { $set: { limit, ...(alertThreshold !== undefined && { alertThreshold }) } },
    { upsert: true, new: true, runValidators: true }
  );

  return budget.toJSON();
};

/**
 * Update an existing budget's limit / alertThreshold.
 */
const update = async (userId, budgetId, { limit, alertThreshold }) => {
  const fields = {};
  if (limit !== undefined)          fields.limit          = limit;
  if (alertThreshold !== undefined) fields.alertThreshold = alertThreshold;

  if (!Object.keys(fields).length)
    throw new AppError('Nothing to update.', 400, 'NO_FIELDS');

  const budget = await Budget.findOneAndUpdate(
    { _id: budgetId, userId },
    { $set: fields },
    { new: true, runValidators: true }
  );

  if (!budget) throw new AppError('Budget not found.', 404, 'NOT_FOUND');
  return budget.toJSON();
};

/**
 * Delete a budget entry.
 */
const remove = async (userId, budgetId) => {
  const budget = await Budget.findOneAndDelete({ _id: budgetId, userId });
  if (!budget) throw new AppError('Budget not found.', 404, 'NOT_FOUND');
};

/**
 * Budget vs actual spending status for all categories in a month.
 *
 * Returns one row per budget entry enriched with:
 *   spent          – actual spending (from Expense collection)
 *   remaining      – limit - spent (clamped to 0)
 *   usagePercent   – 0.0 – 1.0
 *   isOverBudget   – boolean
 *   isAlertTrigger – boolean (usagePercent >= alertThreshold)
 *
 * Categories with no budget set are omitted.
 * Also returns an `unbudgeted` array listing categories that have
 * spending but no budget set — useful for recommending new budgets.
 */
const getStatus = async (userId, { year, month } = {}) => {
  const now = new Date();
  const y   = year  ?? now.getFullYear();
  const m   = month ?? (now.getMonth() + 1);
  const key = toMonthKey(y, m);

  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 1);
  const uid   = new mongoose.Types.ObjectId(userId);

  // Run budgets + actual spending in parallel
  const [budgets, actuals] = await Promise.all([
    Budget.find({ userId, month: key }).lean(),
    Expense.aggregate([
      { $match: { userId: uid, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', spent: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  // Build actuals map
  const actualMap = {};
  for (const row of actuals) actualMap[row._id] = { spent: r2(row.spent), count: row.count };

  // Enrich budget rows
  const budgeted = budgets.map((b) => {
    const actual       = actualMap[b.category] ?? { spent: 0, count: 0 };
    const spent        = actual.spent;
    const remaining    = r2(Math.max(0, b.limit - spent));
    const usagePercent = b.limit > 0 ? r2(spent / b.limit) : 0;

    return {
      id:             b._id,
      category:       b.category,
      month:          b.month,
      limit:          b.limit,
      spent,
      remaining,
      usagePercent,
      alertThreshold: b.alertThreshold,
      isOverBudget:   spent > b.limit,
      isAlertTrigger: usagePercent >= b.alertThreshold,
      transactionCount: actual.count,
    };
  });

  // Find categories with spending but no budget set
  const budgetedCategories = new Set(budgets.map((b) => b.category));
  const unbudgeted = actuals
    .filter((a) => !budgetedCategories.has(a._id))
    .map((a) => ({ category: a._id, spent: r2(a.spent), count: a.count }))
    .sort((a, b) => b.spent - a.spent);

  return {
    period:      { year: y, month: m },
    budgeted,
    unbudgeted,
    summary: {
      totalBudgeted:  r2(budgets.reduce((s, b) => s + b.limit, 0)),
      totalSpent:     r2(budgeted.reduce((s, b) => s + b.spent, 0)),
      overBudgetCount: budgeted.filter((b) => b.isOverBudget).length,
      alertCount:      budgeted.filter((b) => b.isAlertTrigger).length,
    },
  };
};

module.exports = { getAll, create, update, remove, getStatus };
