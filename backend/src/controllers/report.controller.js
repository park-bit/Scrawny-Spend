'use strict';

/**
 * src/controllers/report.controller.js
 * Mounted at /api/reports
 *
 *   GET /api/reports/monthly/:year/:month  – JSON monthly summary
 *   GET /api/reports/export/csv            – CSV download of expenses
 */

const mongoose = require('mongoose');
const Expense  = require('../models/Expense');
const analyticsService = require('../services/analyticsService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const getMonthly = async (req, res, next) => {
  try {
    const year  = parseInt(req.params.year,  10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12)
      return sendError(res, 'Invalid year or month.', 400, 'INVALID_PARAMS');

    const [summary, trends, topExpenses] = await Promise.all([
      analyticsService.getSummary(req.user.id, { year, month }),
      analyticsService.getTrends(req.user.id, { months: 3 }),
      analyticsService.getTopExpenses(req.user.id, { k: 5 }),
    ]);

    return sendSuccess(res, { year, month, summary, trends, topExpenses }, 'Monthly report retrieved.');
  } catch (err) { return next(err); }
};

const exportCsv = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;
    const uid = new mongoose.Types.ObjectId(req.user.id);

    const filter = { userId: uid };
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   { const e = new Date(endDate); e.setHours(23,59,59,999); filter.date.$lte = e; }
    }

    const rows = await Expense.find(filter)
      .sort({ date: -1 })
      .limit(5000) // safety cap
      .select('type amount description category date paymentMethod tags isAnomaly')
      .lean();

    // Build CSV manually (no dependency on csv-stringify to keep it simple)
    const headers = ['date','type','amount','description','category','paymentMethod','tags','isAnomaly'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      headers.join(','),
      ...rows.map((r) => [
        esc(new Date(r.date).toISOString().slice(0, 10)),
        esc(r.type),
        r.amount,
        esc(r.description),
        esc(r.category),
        esc(r.paymentMethod),
        esc((r.tags || []).join('|')),
        r.isAnomaly ? 'true' : 'false',
      ].join(',')),
    ];

    const filename = `expenses_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(lines.join('\n'));
  } catch (err) { return next(err); }
};

module.exports = { getMonthly, exportCsv };
