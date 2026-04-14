'use strict';

/**
 * src/services/notificationService.js
 *
 * Checks if a user has exceeded their alert threshold for a
 * given category budget and emits a notification.
 *
 * Phase 1: server-side log only.
 * Phase 2: integrate an email provider (Resend / SendGrid free tier)
 *          or Web Push notifications via the PWA service worker.
 */

const Budget = require('../models/Budget');
const logger = require('../utils/logger');

/**
 * Called after an expense is created/updated.
 * Recalculates spend vs. limit and fires an alert if the
 * threshold is crossed.
 *
 * @param {string} userId
 * @param {string} category
 * @param {string} month      - "YYYY-MM"
 */
const checkBudgetAlert = async (userId, category, month) => {
  try {
    const budget = await Budget.findOne({ userId, category, month });
    if (!budget) return;

    const usage = budget.spent / budget.limit;
    if (usage >= budget.alertThreshold) {
      logger.warn(
        `[Budget Alert] User ${userId} | ${category} | ` +
        `${Math.round(usage * 100)}% of ₹${budget.limit} used in ${month}`
      );

      // TODO Phase 2: await emailService.sendBudgetAlert(userId, budget);
      //               await pushService.send(userId, { title: 'Budget alert', ... });
    }
  } catch (err) {
    // Non-critical – log and continue; don't break the main request
    logger.error(`notificationService.checkBudgetAlert failed: ${err.message}`);
  }
};

module.exports = { checkBudgetAlert };
