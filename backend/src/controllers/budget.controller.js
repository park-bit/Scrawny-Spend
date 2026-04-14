'use strict';

/**
 * src/controllers/budget.controller.js
 * Mounted at /api/budgets
 */

const budgetService   = require('../services/budgetService');
const { sendSuccess } = require('../utils/responseHelper');

/** GET /api/budgets?year=&month= */
const getAll = async (req, res, next) => {
  try {
    const data = await budgetService.getAll(req.user.id, req.query);
    return sendSuccess(res, data, 'Budgets retrieved.');
  } catch (err) { return next(err); }
};

/** POST /api/budgets  — create/upsert a budget limit */
const create = async (req, res, next) => {
  try {
    const budget = await budgetService.create(req.user.id, req.body);
    return sendSuccess(res, budget, 'Budget set.', 201);
  } catch (err) { return next(err); }
};

/** GET /api/budgets/status?year=&month= */
const getStatus = async (req, res, next) => {
  try {
    const data = await budgetService.getStatus(req.user.id, req.query);
    return sendSuccess(res, data, 'Budget status retrieved.');
  } catch (err) { return next(err); }
};

/** PUT /api/budgets/:id */
const update = async (req, res, next) => {
  try {
    const budget = await budgetService.update(req.user.id, req.params.id, req.body);
    return sendSuccess(res, budget, 'Budget updated.');
  } catch (err) { return next(err); }
};

/** DELETE /api/budgets/:id */
const remove = async (req, res, next) => {
  try {
    await budgetService.remove(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Budget deleted.');
  } catch (err) { return next(err); }
};

module.exports = { getAll, create, getStatus, update, remove };
