'use strict';

/**
 * src/services/expenseService.js
 * All expense + income CRUD + AI enrichment.
 */

const mongoose = require('mongoose');
const Expense  = require('../models/Expense');
const Budget   = require('../models/Budget');
const Anomaly  = require('../models/Anomaly');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');
const { checkBudgetAlert }          = require('./notificationService');
const { classify, detectAnomalies } = require('./aiService');
const { monthlySummaryByCategory, monthlyTrend } = require('../utils/aggregationPipelines');

const toMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const adjustBudgetSpent = async (userId, category, month, delta) => {
  if (delta === 0) return;
  const result = await Budget.findOneAndUpdate(
    { userId, category, month },
    { $inc: { spent: delta } },
    { new: true }
  );
  if (result?.spent < 0) await Budget.findByIdAndUpdate(result._id, { $set: { spent: 0 } });
};

const findOwnedExpense = async (expenseId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(expenseId))
    throw new AppError('Invalid expense ID.', 400, 'INVALID_ID');
  const expense = await Expense.findOne({ _id: expenseId, userId });
  if (!expense) throw new AppError('Expense not found.', 404, 'NOT_FOUND');
  return expense;
};

const enrichWithAI = async (expense, userProvidedCategory) => {
  // Skip AI enrichment entirely for income records
  if (expense.type === 'income') return;

  const expenseId = expense._id;

  // 1. Classify description
  if (!userProvidedCategory || expense.category === 'other') {
    try {
      const classification = await classify({ description: expense.description, amount: expense.amount });
      const confident = !classification.fallback && classification.confidence > 0.3;
      await Expense.findByIdAndUpdate(expenseId, {
        $set: {
          category:           confident ? classification.category : expense.category,
          categoryConfidence: classification.confidence,
          aiClassified:       confident,
        },
      });
      if (confident) logger.info(`AI classified ${expenseId}: → ${classification.category} (${(classification.confidence*100).toFixed(1)}%)`);
    } catch (err) {
      logger.error(`AI classification failed for ${expenseId}: ${err.message}`);
    }
  }

  // 2. Anomaly detection against last 90 days of expenses (not income)
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const recentExpenses = await Expense.find({
      userId: expense.userId, type: 'expense', date: { $gte: cutoff },
    }).select('amount category date description').lean();

    const hasNew = recentExpenses.some((e) => e._id.toString() === expenseId.toString());
    const expensesForScan = hasNew ? recentExpenses : [...recentExpenses, expense.toObject()];
    const { anomalies } = await detectAnomalies(expensesForScan);
    const thisAnomaly = anomalies.find((a) => a.id === expenseId.toString());

    if (thisAnomaly) {
      await Expense.findByIdAndUpdate(expenseId, {
        $set: { isAnomaly: true, anomalyScore: thisAnomaly.anomalyScore },
      });
      await Anomaly.findOneAndUpdate(
        { expenseId },
        { $set: { userId: expense.userId, expenseId, score: thisAnomaly.anomalyScore, reason: thisAnomaly.reason }, $setOnInsert: { resolvedAt: null } },
        { upsert: true, new: true }
      );
      logger.warn(`Anomaly flagged: ${expenseId} | score=${thisAnomaly.anomalyScore}`);
    }
  } catch (err) {
    logger.error(`Anomaly detection failed for ${expenseId}: ${err.message}`);
  }
};


const getAll = async (userId, query) => {
  const { type, category, paymentMethod, startDate, endDate, minAmount, maxAmount,
          search, isAnomaly, sortBy, sortOrder, page, limit } = query;

  const filter = { userId };
  if (type)          filter.type          = type;
  if (category)      filter.category      = category;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (isAnomaly !== undefined) filter.isAnomaly = isAnomaly;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate)   { const e = new Date(endDate); e.setHours(23,59,59,999); filter.date.$lte = e; }
  }
  if (minAmount !== undefined || maxAmount !== undefined) {
    filter.amount = {};
    if (minAmount !== undefined) filter.amount.$gte = minAmount;
    if (maxAmount !== undefined) filter.amount.$lte = maxAmount;
  }
  if (search) filter.$or = [
    { description: { $regex: search, $options: 'i' } },
    { tags:        { $regex: search, $options: 'i' } },
  ];

  const sort  = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip  = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Expense.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Expense.countDocuments(filter),
  ]);

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit) } };
};

const create = async (userId, dto) => {
  const userProvidedCategory = !!dto.category && dto.category !== 'other';
  const expense = await Expense.create({ ...dto, userId });
  const month   = toMonthKey(expense.date);

  // Budget sync only for expenses, not income
  if (expense.type === 'expense') {
    adjustBudgetSpent(userId, expense.category, month, expense.amount)
      .then(() => checkBudgetAlert(userId, expense.category, month))
      .catch((err) => logger.error(`Budget sync failed after create [${expense._id}]: ${err.message}`));
  }

  setImmediate(() => {
    enrichWithAI(expense, userProvidedCategory).catch((err) =>
      logger.error(`enrichWithAI failed for ${expense._id}: ${err.message}`)
    );
  });

  logger.info(`${expense.type} created: ${expense._id} | user: ${userId} | ₹${expense.amount}`);
  return expense.toJSON();
};

const getOne = async (userId, expenseId) => {
  const expense = await findOwnedExpense(expenseId, userId);
  return expense.toJSON();
};

const update = async (userId, expenseId, dto) => {
  const existing = await findOwnedExpense(expenseId, userId);
  const oldAmount = existing.amount, oldCategory = existing.category, oldMonth = toMonthKey(existing.date);

  Object.assign(existing, dto);
  const updated    = await existing.save();
  const newAmount  = updated.amount, newCategory = updated.category, newMonth = toMonthKey(updated.date);

  if (existing.type === 'expense') {
    const budgetAffected = oldAmount !== newAmount || oldCategory !== newCategory || oldMonth !== newMonth;
    if (budgetAffected) {
      const syncOps = oldCategory + oldMonth === newCategory + newMonth
        ? [adjustBudgetSpent(userId, oldCategory, oldMonth, newAmount - oldAmount)]
        : [adjustBudgetSpent(userId, oldCategory, oldMonth, -oldAmount), adjustBudgetSpent(userId, newCategory, newMonth, newAmount)];

      Promise.all(syncOps)
        .then(() => checkBudgetAlert(userId, newCategory, newMonth))
        .catch((err) => logger.error(`Budget sync failed after update [${expenseId}]: ${err.message}`));
    }
  }

  logger.info(`${updated.type} updated: ${expenseId}`);
  return updated.toJSON();
};

const remove = async (userId, expenseId) => {
  const expense = await findOwnedExpense(expenseId, userId);
  const month   = toMonthKey(expense.date);
  await expense.deleteOne();

  if (expense.type === 'expense') {
    adjustBudgetSpent(userId, expense.category, month, -expense.amount)
      .catch((err) => logger.error(`Budget sync failed after delete [${expenseId}]: ${err.message}`));
  }

  Anomaly.deleteOne({ expenseId: expense._id }).catch(() => {});
  logger.info(`${expense.type} deleted: ${expenseId}`);
};

const getSummary = async (userId, { year, month }) => {
  const pipeline   = monthlySummaryByCategory(userId, year, month);
  const byCategory = await Expense.aggregate(pipeline);
  const grandTotal = byCategory.reduce((s, row) => s + row.total, 0);
  return { year, month, grandTotal: Math.round(grandTotal * 100) / 100, byCategory };
};

const getTrends = async (userId, { months }) => {
  return Expense.aggregate(monthlyTrend(userId, months));
};

module.exports = { getAll, create, getOne, update, remove, getSummary, getTrends };
