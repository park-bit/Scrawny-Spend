'use strict';

/**
 * src/routes/budget.routes.js
 * Mounted at: /api/budgets
 *
 *   GET    /api/budgets           – list budgets for a month
 *   POST   /api/budgets           – create / upsert a budget
 *   GET    /api/budgets/status    – budget vs actual spending status
 *   PUT    /api/budgets/:id       – update limit / alertThreshold
 *   DELETE /api/budgets/:id       – remove a budget
 *
 * NOTE: /status must be registered before /:id so Express doesn't
 * treat "status" as an ObjectId parameter.
 */

const router  = require('express').Router();
const Joi     = require('joi');
const { protect }        = require('../middleware/auth');
const { validate }       = require('../middleware/validate');
const budgetController   = require('../controllers/budget.controller');
const { EXPENSE_CATEGORIES } = require('../models/Expense');

router.use(protect);

const yearField  = Joi.number().integer().min(2000).max(2100);
const monthField = Joi.number().integer().min(1).max(12);

const createSchema = Joi.object({
  category:       Joi.string().valid(...EXPENSE_CATEGORIES).required()
    .messages({ 'any.required': 'category is required.', 'any.only': 'Invalid category.' }),
  limit:          Joi.number().positive().required()
    .messages({ 'any.required': 'limit is required.' }),
  month:          Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .messages({ 'string.pattern.base': 'month must be YYYY-MM format.' }),
  alertThreshold: Joi.number().min(0.1).max(1.0),
});

const updateSchema = Joi.object({
  limit:          Joi.number().positive(),
  alertThreshold: Joi.number().min(0.1).max(1.0),
}).min(1).messages({ 'object.min': 'Provide at least one field to update.' });

const querySchema = Joi.object({
  year:  yearField,
  month: monthField,
});

const idSchema = Joi.object({
  id: Joi.string().pattern(/^[a-f\d]{24}$/i).required()
    .messages({ 'string.pattern.base': 'Invalid budget ID.' }),
});

router.get('/',         validate(querySchema, 'query'), budgetController.getAll);
router.post('/',        validate(createSchema),         budgetController.create);
router.get('/status',   validate(querySchema, 'query'), budgetController.getStatus);
router.put('/:id',      validate(idSchema, 'params'), validate(updateSchema), budgetController.update);
router.delete('/:id',   validate(idSchema, 'params'), budgetController.remove);

module.exports = router;
