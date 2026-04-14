'use strict';

/**
 * src/controllers/analytics.controller.js
 *
 * Thin HTTP layer for all analytics endpoints.
 * Delegates all computation to analyticsService.
 *
 * Route surface (mounted at /api/analytics):
 *   GET /summary          – income, expenses, balance, category breakdown
 *   GET /trends           – monthly trend chart data with deltas
 *   GET /top-expenses     – top K highest expenses (min-heap)
 *   GET /suggestions      – greedy savings suggestions
 *   GET /savings-plan     – backtracking savings combinations
 */

const analyticsService = require('../services/analyticsService');
const { sendSuccess }  = require('../utils/responseHelper');

// GET /api/analytics/summary

/**
 * Enhanced monthly financial summary.
 *
 * Query params (all optional):
 *   year  – defaults to current year
 *   month – defaults to current month (1-based)
 *
 * Response 200:
 *   { period, totalIncome, totalExpenses, balance, savingsRate, byCategory }
 */
const getSummary = async (req, res, next) => {
  try {
    const result = await analyticsService.getSummary(req.user.id, req.query);
    return sendSuccess(res, result, 'Summary retrieved.');
  } catch (err) {
    return next(err);
  }
};

// GET /api/analytics/trends

/**
 * Monthly spending trends with month-over-month delta.
 *
 * Query params:
 *   months – number of months to look back (default 6, max 24)
 *
 * Response 200:
 *   [{ year, month, total, count, byCategory, delta, deltaPercent, trend }]
 */
const getTrends = async (req, res, next) => {
  try {
    const result = await analyticsService.getTrends(req.user.id, req.query);
    return sendSuccess(res, result, 'Trends retrieved.');
  } catch (err) {
    return next(err);
  }
};

// GET /api/analytics/top-expenses

/**
 * Top-K highest expenses using a min-heap.
 *
 * Query params:
 *   k          – number of results (default 10, max 50)
 *   startDate  – ISO date string (optional)
 *   endDate    – ISO date string (optional)
 *   category   – filter to one category (optional)
 *
 * Response 200:
 *   { k, period, topExpenses: [{ amount, description, category, date, ... }] }
 */
const getTopExpenses = async (req, res, next) => {
  try {
    const result = await analyticsService.getTopExpenses(req.user.id, req.query);
    return sendSuccess(res, result, `Top ${result.k} expenses retrieved.`);
  } catch (err) {
    return next(err);
  }
};

// GET /api/analytics/suggestions

/**
 * Greedy savings suggestions ranked by priority score.
 *
 * Query params:
 *   year           – period to analyse (default current year)
 *   month          – period to analyse (default current month)
 *   months         – months of history to compare against (default 3)
 *   targetPercent  – desired saving as % of total spend (default 20)
 *
 * Response 200:
 *   { period, totalSpend, targetSaving, suggestions: [...] }
 */
const getSavingsSuggestions = async (req, res, next) => {
  try {
    const result = await analyticsService.getSavingsSuggestions(req.user.id, req.query);
    return sendSuccess(res, result, 'Savings suggestions generated.');
  } catch (err) {
    return next(err);
  }
};

// GET /api/analytics/savings-plan

/**
 * Backtracking savings planner: find combinations of category cuts
 * that meet a specific savings goal.
 *
 * Query params:
 *   goalAmount  – target saving amount in currency units (required)
 *   year        – period to analyse (default current year)
 *   month       – period to analyse (default current month)
 *   months      – months of history for average comparison (default 3)
 *   maxPlans    – maximum number of plans to return (default 5, max 10)
 *
 * Response 200:
 *   { goal, totalSpend, plansFound, plans: [{ cuts, totalSaving, cutCount, summary }] }
 */
const getSavingsPlan = async (req, res, next) => {
  try {
    const result = await analyticsService.getSavingsPlan(req.user.id, req.query);
    return sendSuccess(res, result, 'Savings plan generated.');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getSummary,
  getTrends,
  getTopExpenses,
  getSavingsSuggestions,
  getSavingsPlan,
};
