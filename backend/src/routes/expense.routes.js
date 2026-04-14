'use strict';

/**
 * src/routes/expense.routes.js
 * Mounted at: /api/expenses
 *
 * Route map:
 *   GET    /api/expenses            – paginated + filtered list
 *   POST   /api/expenses            – create expense
 *   GET    /api/expenses/summary    – category totals for a month
 *   GET    /api/expenses/trends     – monthly totals for last N months
 *   GET    /api/expenses/:id        – single expense
 *   PUT    /api/expenses/:id        – update expense
 *   DELETE /api/expenses/:id        – delete expense
 *
 * Note: /summary and /trends are registered before /:id so Express
 * doesn't swallow them as ObjectId params.
 */

const router = require('express').Router();

const { protect }          = require('../middleware/auth');
const { validate }         = require('../middleware/validate');
const expenseController    = require('../controllers/expense.controller');
const {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  summaryQuerySchema,
  trendsQuerySchema,
  idParamSchema,
} = require('../validators/expense.validators');

// All expense routes require a valid JWT
router.use(protect);

router.get(
  '/',
  validate(listExpensesSchema, 'query'),
  expenseController.getAll
);

router.post(
  '/',
  validate(createExpenseSchema),
  expenseController.create
);

router.get(
  '/summary',
  validate(summaryQuerySchema, 'query'),
  expenseController.getSummary
);

router.get(
  '/trends',
  validate(trendsQuerySchema, 'query'),
  expenseController.getTrends
);

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  expenseController.getOne
);

router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateExpenseSchema),
  expenseController.update
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  expenseController.remove
);

module.exports = router;
