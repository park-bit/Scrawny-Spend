'use strict';

/**
 * src/routes/analytics.routes.js
 * Mounted at: /api/analytics
 *
 * Route map:
 *   GET /api/analytics/summary        – income / expense / balance breakdown
 *   GET /api/analytics/trends         – monthly trend chart data
 *   GET /api/analytics/top-expenses   – top K expenses via min-heap
 *   GET /api/analytics/suggestions    – greedy savings suggestions
 *   GET /api/analytics/savings-plan   – backtracking savings planner
 *
 * All routes are protected by JWT middleware.
 */

const router = require('express').Router();

const { protect }            = require('../middleware/auth');
const { validate }           = require('../middleware/validate');
const analyticsController    = require('../controllers/analytics.controller');
const {
  summaryQuerySchema,
  trendsQuerySchema,
  topExpensesQuerySchema,
  suggestionsQuerySchema,
  savingsPlanQuerySchema,
} = require('../validators/analytics.validators');

// All analytics routes require a valid access token
router.use(protect);

router.get(
  '/summary',
  validate(summaryQuerySchema, 'query'),
  analyticsController.getSummary
);

router.get(
  '/trends',
  validate(trendsQuerySchema, 'query'),
  analyticsController.getTrends
);

router.get(
  '/top-expenses',
  validate(topExpensesQuerySchema, 'query'),
  analyticsController.getTopExpenses
);

router.get(
  '/suggestions',
  validate(suggestionsQuerySchema, 'query'),
  analyticsController.getSavingsSuggestions
);

router.get(
  '/savings-plan',
  validate(savingsPlanQuerySchema, 'query'),
  analyticsController.getSavingsPlan
);

module.exports = router;
