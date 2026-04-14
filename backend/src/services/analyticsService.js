'use strict';

/**
 * src/services/analyticsService.js
 * Analytics + Optimisation Engine.
 *
 * Income/balance now driven by the Expense.type field ('expense'|'income'),
 * not by a fragile category-name match.
 */

const mongoose = require('mongoose');
const Expense  = require('../models/Expense');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');
const { monthlySummaryByCategory, monthlyTrend } = require('../utils/aggregationPipelines');

const DISCRETIONARY_CATEGORIES = new Set([
  'entertainment', 'shopping', 'travel', 'food', 'education',
]);

const r2 = (n) => Math.round(n * 100) / 100;

// Min-Heap for Top-K selection  O(n log k)
class MinHeap {
  constructor(compareFn) {
    this._heap = [];
    this._cmp  = compareFn || ((a, b) => a - b);
  }
  get size() { return this._heap.length; }
  get min()  { return this._heap[0]; }

  push(item) { this._heap.push(item); this._bubbleUp(this._heap.length - 1); }

  pop() {
    const top = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0) { this._heap[0] = last; this._sinkDown(0); }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this._cmp(this._heap[i], this._heap[p]) < 0) {
        [this._heap[i], this._heap[p]] = [this._heap[p], this._heap[i]]; i = p;
      } else break;
    }
  }

  _sinkDown(i) {
    const n = this._heap.length;
    while (true) {
      let s = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this._cmp(this._heap[l], this._heap[s]) < 0) s = l;
      if (r < n && this._cmp(this._heap[r], this._heap[s]) < 0) s = r;
      if (s === i) break;
      [this._heap[i], this._heap[s]] = [this._heap[s], this._heap[i]]; i = s;
    }
  }

  toSortedDesc() { return [...this._heap].sort((a, b) => this._cmp(b, a)); }
}

// Backtracking savings planner
const backtrack = (categories, goal, index, current, accumulated, solutions, maxSolutions) => {
  if (accumulated >= goal) {
    solutions.push({ cuts: current.map(c => ({ ...c })), totalSaving: r2(accumulated), goalMet: true });
    return;
  }
  if (index >= categories.length || solutions.length >= maxSolutions) return;

  let potential = 0;
  for (let i = index; i < categories.length; i++) potential += categories[i].maxCut;
  if (accumulated + potential < goal) return;

  const cat = categories[index];
  current.push(cat);
  backtrack(categories, goal, index + 1, current, accumulated + cat.suggestedCut, solutions, maxSolutions);
  current.pop();
  backtrack(categories, goal, index + 1, current, accumulated, solutions, maxSolutions);
};

// Aggregation pipelines

/** Income vs expense split — uses type field directly */
const incomeExpenseSplitPipeline = (userId, start, end) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date:   { $gte: start, $lt: end },
    },
  },
  {
    $group: {
      _id:   '$type',   // 'income' | 'expense'
      total: { $sum: '$amount' },
      count: { $sum: 1 },
    },
  },
];

/** Monthly totals with per-category breakdown (expense-only) */
const detailedMonthlyTrendPipeline = (userId, months) => {
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type:   'expense',   // exclude income from trend chart
        date:   { $gte: start },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' }, category: '$category' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: { year: '$_id.year', month: '$_id.month' },
        total: { $sum: '$total' },
        count: { $sum: '$count' },
        byCategory: {
          $push: {
            category: '$_id.category',
            total:    { $round: ['$total', 2] },
            count:    '$count',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        year:       '$_id.year',
        month:      '$_id.month',
        total:      { $round: ['$total', 2] },
        count:      1,
        byCategory: 1,
      },
    },
    { $sort: { year: 1, month: 1 } },
  ];
};

// 1. getSummary
const getSummary = async (userId, { year, month }) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);

  const [byCategory, splitResult] = await Promise.all([
    // Only expense categories in breakdown
    Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type:   'expense',
          date:   { $gte: start, $lt: end },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, category: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate(incomeExpenseSplitPipeline(userId, start, end)),
  ]);

  const split = { income: 0, expense: 0 };
  for (const row of splitResult) split[row._id] = r2(row.total);

  const totalIncome   = split.income;
  const totalExpenses = split.expense;
  const balance       = r2(totalIncome - totalExpenses);
  const savingsRate   = totalIncome > 0
    ? r2(((totalIncome - totalExpenses) / totalIncome) * 100)
    : null;

  return {
    period: { year, month },
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    byCategory,
  };
};

// 2. getTrends
const getTrends = async (userId, { months }) => {
  const raw = await Expense.aggregate(detailedMonthlyTrendPipeline(userId, months));

  return raw.map((point, i) => {
    if (i === 0) return { ...point, delta: null, deltaPercent: null, trend: 'flat' };
    const prev        = raw[i - 1].total;
    const curr        = point.total;
    const delta       = r2(curr - prev);
    const deltaPercent = prev > 0 ? r2(((curr - prev) / prev) * 100) : null;
    const trend       = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    return { ...point, delta, deltaPercent, trend };
  });
};

// 3. getTopExpenses   O(n log k)
const getTopExpenses = async (userId, { k, startDate, endDate, category }) => {
  const filter = { userId, type: 'expense' };
  if (category) filter.category = category;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate)   filter.date.$lte = new Date(endDate);
  }

  const heap   = new MinHeap((a, b) => a.amount - b.amount);
  const cursor = Expense.find(filter)
    .select('amount description category date paymentMethod')
    .lean()
    .cursor();

  for await (const doc of cursor) {
    if (heap.size < k) heap.push(doc);
    else if (doc.amount > heap.min.amount) { heap.pop(); heap.push(doc); }
  }

  return {
    k,
    period: { startDate: startDate || null, endDate: endDate || null },
    topExpenses: heap.toSortedDesc(),
  };
};

// 4. getSavingsSuggestions  (Greedy)
const getSavingsSuggestions = async (userId, { year, month, months, targetPercent }) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);

  const currentPipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $project: { _id: 0, category: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
    { $sort: { total: -1 } },
  ];

  const currentData = await Expense.aggregate(currentPipeline);
  if (!currentData.length) return { period: { year, month }, suggestions: [], message: 'No expense data.' };

  const histStart = new Date(year, month - 1 - months, 1);
  const histEnd   = new Date(year, month - 1, 1);

  const historicalPipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: histStart, $lt: histEnd } } },
    {
      $group: {
        _id:        '$category',
        totalSpend: { $sum: '$amount' },
        monthCount: { $addToSet: { $dateToString: { format: '%Y-%m', date: '$date' } } },
      },
    },
    {
      $project: {
        _id: 0, category: '$_id',
        average: { $round: [{ $divide: ['$totalSpend', { $size: '$monthCount' }] }, 2] },
      },
    },
  ];

  const historicalData = await Expense.aggregate(historicalPipeline);
  const avgMap = {};
  for (const row of historicalData) avgMap[row.category] = row.average;

  const totalCurrentSpend  = currentData.reduce((s, r) => s + r.total, 0);
  const targetSavingAmt    = r2(totalCurrentSpend * (targetPercent / 100));

  const scored = currentData.map((row) => {
    const historical      = avgMap[row.category] ?? row.total;
    const ratio           = historical > 0 ? row.total / historical : 1;
    const isDiscretionary = DISCRETIONARY_CATEGORIES.has(row.category);
    const rawCut          = Math.max(0, row.total - historical);
    const suggestedCut    = r2(Math.min(rawCut, row.total * 0.3));
    const priorityScore   = r2(ratio * (isDiscretionary ? 1.5 : 1.0));

    return {
      category:        row.category,
      currentSpend:    r2(row.total),
      historicalAvg:   r2(historical),
      ratio:           r2(ratio),
      suggestedCut,
      newTarget:       r2(row.total - suggestedCut),
      isDiscretionary,
      priorityScore,
      impactPercent:   targetSavingAmt > 0 ? r2((suggestedCut / targetSavingAmt) * 100) : null,
      reasoning: ratio > 1.2
        ? `Spending ${r2((ratio - 1) * 100)}% above your usual average in this category.`
        : ratio < 0.8
          ? 'Currently below your average — maintain this discipline.'
          : 'Spending is near your historical average.',
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    period: { year, month },
    totalSpend: r2(totalCurrentSpend),
    targetPercent,
    targetSaving: targetSavingAmt,
    suggestions: scored,
    historicalMonths: months,
  };
};

// 5. getSavingsPlan  (Backtracking)
const getSavingsPlan = async (userId, { year, month, goalAmount, months, maxPlans }) => {
  const monthTotal = await _getMonthExpenseTotal(userId, year, month);
  const targetPercent = monthTotal > 0 ? (goalAmount / monthTotal) * 100 : 20;

  const { suggestions, totalSpend } = await getSavingsSuggestions(userId, {
    year, month, months, targetPercent,
  });

  if (!suggestions.length) {
    return { goal: goalAmount, plans: [], message: 'No expense data to build a plan.' };
  }

  const candidates = suggestions
    .filter((s) => s.suggestedCut > 0)
    .map((s) => ({
      category: s.category, currentSpend: s.currentSpend,
      suggestedCut: s.suggestedCut, maxCut: s.currentSpend, reasoning: s.reasoning,
    }))
    .sort((a, b) => b.maxCut - a.maxCut);

  const solutions = [];
  backtrack(candidates, goalAmount, 0, [], 0, solutions, maxPlans);
  solutions.sort((a, b) => a.cuts.length - b.cuts.length);

  const plans = solutions.map((sol, idx) => ({
    planNumber:  idx + 1,
    cuts:        sol.cuts,
    totalSaving: sol.totalSaving,
    goalMet:     sol.goalMet,
    cutCount:    sol.cuts.length,
    summary:     sol.cuts.map((c) => `Cut ${c.category} by ₹${c.suggestedCut}`).join(', '),
  }));

  return {
    goal: goalAmount, period: { year, month },
    totalSpend: r2(totalSpend),
    candidatePool: candidates.length,
    plansFound: plans.length, plans,
    algorithmNote: 'Backtracking with branch-and-bound pruning.',
  };
};

const _getMonthExpenseTotal = async (userId, year, month) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);
  const result = await Expense.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 1;
};

module.exports = { getSummary, getTrends, getTopExpenses, getSavingsSuggestions, getSavingsPlan };
