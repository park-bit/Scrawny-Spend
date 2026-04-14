'use strict';

/**
 * src/utils/aggregationPipelines.js
 *
 * Reusable MongoDB aggregation pipeline builders.
 * Both pipelines now scope to type='expense' so income records
 * are never counted in spending summaries or trend charts.
 */

const mongoose = require('mongoose');

/**
 * Monthly expense totals grouped by category (expenses only).
 * @param {string} userId
 * @param {number} year
 * @param {number} month  - 1-based
 * @returns {Array}
 */
const monthlySummaryByCategory = (userId, year, month) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);

  return [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type:   'expense',          // ← exclude income records
        date:   { $gte: start, $lt: end },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $project: { _id: 0, category: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
    { $sort: { total: -1 } },
  ];
};

/**
 * Monthly expense totals for the last N months (expenses only).
 * @param {string} userId
 * @param {number} [months=6]
 * @returns {Array}
 */
const monthlyTrend = (userId, months = 6) => {
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type:   'expense',          // ← exclude income records
        date:   { $gte: start },
      },
    },
    {
      $group: {
        _id:   { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id:   0,
        year:  '$_id.year',
        month: '$_id.month',
        total: { $round: ['$total', 2] },
        count: 1,
      },
    },
    { $sort: { year: 1, month: 1 } },
  ];
};

module.exports = { monthlySummaryByCategory, monthlyTrend };
