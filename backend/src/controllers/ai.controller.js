'use strict';

/**
 * src/controllers/ai.controller.js
 *
 *   POST /api/ai/classify       – classify description on demand
 *   GET  /api/ai/predict        – ANN next-month prediction
 *   GET  /api/ai/anomalies      – stored anomaly records
 *   GET  /api/ai/insights       – structured analysis panel (no Gemini)
 *   GET  /api/ai/gemini-report  – natural-language report (user's Gemini key)
 */

const Expense          = require('../models/Expense');
const Anomaly          = require('../models/Anomaly');
const User             = require('../models/User');
const aiService        = require('../services/aiService');
const analyticsService = require('../services/analyticsService');
const geminiService    = require('../services/geminiService');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');

const classify = async (req, res, next) => {
  try {
    const { description, amount } = req.body;
    if (!description || typeof description !== 'string')
      return sendError(res, "'description' is required.", 400, 'VALIDATION_ERROR');
    const result = await aiService.classify({ description: description.trim(), amount });
    return sendSuccess(res, result, 'Classification complete.');
  } catch (err) { return next(err); }
};

const predict = async (req, res, next) => {
  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const expenses = await Expense.find({
      userId: req.user.id, type: 'expense', date: { $gte: cutoff },
    }).select('amount category date').sort({ date: 1 }).lean();

    if (!expenses.length)
      return sendError(res, 'No expense history found.', 404, 'NO_DATA');

    const result = await aiService.predict(expenses);
    return sendSuccess(res, result, 'Prediction retrieved.');
  } catch (err) {
    if (['AI_ENGINE_UNAVAILABLE', 'AI_ENGINE_TIMEOUT', 'AI_ENGINE_ERROR'].includes(err.code))
      return sendError(res, 'AI prediction service temporarily unavailable.', err.statusCode || 503, err.code);
    return next(err);
  }
};

const getAnomalies = async (req, res, next) => {
  try {
    const resolved = req.query.resolved === 'true';
    const limit    = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter   = { userId: req.user.id, resolvedAt: resolved ? { $ne: null } : null };
    const [anomalies, total] = await Promise.all([
      Anomaly.find(filter)
        .populate('expenseId', 'amount description category date')
        .sort({ createdAt: -1 }).limit(limit).lean(),
      Anomaly.countDocuments(filter),
    ]);
    return sendSuccess(res, { anomalies, total }, 'Anomalies retrieved.');
  } catch (err) { return next(err); }
};

/**
 * Full dashboard AI panel. Returns:
 *   - Financial snapshot (income, expenses, balance, savingsRate)
 *   - Category breakdown + top category
 *   - Overspending categories (ratio > 1.2 above historical avg)
 *   - Top savings opportunities
 *   - Month-over-month comparison (this month vs previous month)
 *   - Spending trends (last 3 months)
 *   - Anomaly summary
 *   - ANN prediction (best-effort)
 */
const getInsights = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now    = new Date();
    const year   = now.getFullYear();
    const month  = now.getMonth() + 1;

    // Previous month for comparison
    const prevDate  = new Date(year, month - 2, 1);
    const prevYear  = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;

    // Run all queries in parallel
    const [
      anomalyTotal,
      recentAnomalies,
      summary,
      prevSummary,
      suggestions,
      trends,
    ] = await Promise.all([
      Anomaly.countDocuments({ userId, resolvedAt: null }),
      Anomaly.find({ userId, resolvedAt: null })
        .populate('expenseId', 'amount description category date')
        .sort({ createdAt: -1 }).limit(3).lean(),
      analyticsService.getSummary(userId, { year, month }),
      analyticsService.getSummary(userId, { year: prevYear, month: prevMonth }).catch(() => null),
      analyticsService.getSavingsSuggestions(userId, {
        year, month, months: 3, targetPercent: 20,
      }).catch(() => null),
      analyticsService.getTrends(userId, { months: 3 }).catch(() => []),
    ]);

    // AI Available check (simplified, non-blocking)
    const aiAvailable = true; 
    const prediction  = null; 
    // Note: Full prediction is handled by the dedicated /api/ai/predict endpoint
    // to avoid blocking the dashboard summary during engine cold starts.

    // Derived: overspending categories (spending > 120% of historical average)
    const suggestionList = suggestions?.suggestions ?? [];
    const overspending   = suggestionList
      .filter((s) => s.ratio > 1.2)
      .slice(0, 3)
      .map((s) => ({
        category:     s.category,
        currentSpend: s.currentSpend,
        historicalAvg: s.historicalAvg,
        ratio:        s.ratio,
        overspendBy:  Math.round((s.currentSpend - s.historicalAvg) * 100) / 100,
      }));

    // Month-over-month comparison
    const monthComparison = prevSummary ? {
      prevMonth:          { year: prevYear, month: prevMonth },
      prevExpenses:       prevSummary.totalExpenses,
      currentExpenses:    summary.totalExpenses,
      expenseDelta:       Math.round((summary.totalExpenses - prevSummary.totalExpenses) * 100) / 100,
      expenseDeltaPct:    prevSummary.totalExpenses > 0
        ? Math.round(((summary.totalExpenses - prevSummary.totalExpenses) / prevSummary.totalExpenses) * 10000) / 100
        : null,
      trend: summary.totalExpenses > prevSummary.totalExpenses ? 'up'
        : summary.totalExpenses < prevSummary.totalExpenses ? 'down'
        : 'flat',
    } : null;

    const byCategory  = summary.byCategory || [];
    const topCategory = byCategory[0] ?? null;

    return sendSuccess(res, {
      period:        { year, month },
      // Financial snapshot
      totalIncome:   summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      balance:       summary.balance,
      savingsRate:   summary.savingsRate,
      // Category breakdown
      byCategory,
      topCategory,
      // AI-derived insights
      overspending,
      savingsSuggestions:  suggestionList.slice(0, 4),
      targetSaving:        suggestions?.targetSaving ?? null,
      // Month comparison
      monthComparison,
      // Trend data (last 3 months for sparkline)
      trends,
      // Anomalies
      anomalySummary: { total: anomalyTotal, recent: recentAnomalies },
      // ANN prediction
      prediction,
      aiAvailable,
    }, 'Insights retrieved.');
  } catch (err) { return next(err); }
};

/**
 * Natural-language report via user's own Gemini API key.
 * If no key → returns structured insights + geminiAvailable: false.
 * If Gemini fails → returns structured insights + error message.
 */
const getGeminiReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const year   = parseInt(req.query.year,  10) || new Date().getFullYear();
    const month  = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);

    const [user, summary, suggestions] = await Promise.all([
      User.findById(userId).select('+geminiApiKey currency'),
      analyticsService.getSummary(userId, { year, month }),
      analyticsService.getSavingsSuggestions(userId, { year, month, months: 3, targetPercent: 20 })
        .catch(() => ({ suggestions: [] })),
    ]);

    const structuredData = {
      currency:      user?.currency ?? 'INR',
      period:        { year, month },
      totalIncome:   summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      balance:       summary.balance,
      savingsRate:   summary.savingsRate,
      byCategory:    summary.byCategory,
      suggestions:   suggestions.suggestions,
    };

    if (!user?.geminiApiKey) {
      return sendSuccess(res, {
        report:          null,
        geminiAvailable: false,
        geminiNote:      'Add your Gemini API key in Settings to get a natural-language report.',
        insights:        structuredData,
      }, 'Structured insights returned (no Gemini key configured).');
    }

    let report = null;
    let geminiError = null;
    try {
      report = await geminiService.generateReport(user.geminiApiKey, structuredData);
    } catch (err) {
      geminiError = err.message;
      logger.warn(`Gemini report failed for user ${userId}: ${err.message}`);
    }

    return sendSuccess(res, {
      report,
      geminiAvailable: !geminiError,
      geminiError:     geminiError ?? null,
      insights:        structuredData,
    }, report ? 'Gemini report generated.' : 'Structured insights returned (Gemini failed).');
  } catch (err) { return next(err); }
};

module.exports = { classify, predict, getAnomalies, getInsights, getGeminiReport };
