'use strict';

/**
 * src/services/aiService.js
 *
 * Internal HTTP client: Node.js backend ↔ Python Flask AI engine.
 *
 * Design principles:
 *   1. Single callAIEngine() transport helper — all routes share one
 *      fetch implementation with consistent timeout, auth header, and
 *      error normalisation.
 *
 *   2. Every public method has an explicit graceful fallback so the
 *      Node API keeps working when the Python service is cold-starting
 *      (Render free tier spins down after 15 min of inactivity).
 *
 *   3. AI failures are NEVER surfaced as 500s to the client unless the
 *      caller explicitly opts in.  Default: log + return a safe default.
 *
 * Fallback strategy per endpoint:
 *   classify()        → { category: 'other', confidence: 0, fallback: true }
 *   detectAnomalies() → { anomalies: [], fallback: true }
 *   predict()         → throws (caller decides — predict route handles it)
 */

const env      = require('../config/env');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');

// Transport layer

/**
 * POST to the Python AI engine and return parsed JSON.
 * Throws an AppError on HTTP errors, timeouts, or connection failures.
 *
 * @param {string} path
 * @param {object} payload
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<object>}
 */
const callAIEngine = async (path, payload = {}, timeoutMs = 15_000) => {
  const url = `${env.AI_ENGINE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-Internal-Secret': env.AI_ENGINE_SECRET,
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error(`AI engine [${response.status}] ${path}: ${text}`);
      throw new AppError(
        `AI engine returned ${response.status}`,
        502,
        'AI_ENGINE_ERROR'
      );
    }

    return response.json();

  } catch (err) {
    if (err instanceof AppError) throw err;

    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      logger.warn(`AI engine timeout [${path}] after ${timeoutMs}ms`);
      throw new AppError('AI engine timed out.', 504, 'AI_ENGINE_TIMEOUT');
    }

    // ECONNREFUSED / ENOTFOUND – engine is offline
    logger.warn(`AI engine unreachable [${path}]: ${err.message}`);
    throw new AppError('AI engine is offline.', 503, 'AI_ENGINE_UNAVAILABLE');
  }
};

// classify  —  always resolves, never throws

/**
 * Classify an expense description into a category.
 * Falls back to { category: 'other', confidence: 0 } on any failure
 * so expense creation is never blocked by an AI outage.
 *
 * @param {{ description: string, amount?: number }} payload
 * @returns {Promise<{ category: string, confidence: number, topK?: object[], fallback?: boolean }>}
 */
const classify = async ({ description, amount }) => {
  try {
    const result = await callAIEngine('/classify', { description, amount });

    if (!result?.category || typeof result.confidence !== 'number') {
      logger.warn('classify: unexpected response shape from AI engine');
      return { category: 'other', confidence: 0, fallback: true };
    }

    logger.info(
      `classify: "${String(description).slice(0, 40)}" → ${result.category} ` +
      `(${(result.confidence * 100).toFixed(1)}%)`
    );

    return { category: result.category, confidence: result.confidence, topK: result.topK || [] };

  } catch (err) {
    logger.warn(`classify fallback (${err.message}): defaulting to 'other'`);
    return { category: 'other', confidence: 0, fallback: true };
  }
};

// detectAnomalies  —  always resolves, never throws

/**
 * Run anomaly detection over an array of expense documents.
 * Returns an empty anomalies array on failure — expense creation
 * is never blocked by an AI outage.
 *
 * @param {object[]} expenses
 * @returns {Promise<{ anomalies: object[], totalScanned: number, totalFlagged: number, fallback?: boolean }>}
 */
const detectAnomalies = async (expenses) => {
  if (!expenses || expenses.length === 0) {
    return { anomalies: [], totalScanned: 0, totalFlagged: 0 };
  }

  try {
    const payload = expenses.map((e) => ({
      id:          e._id?.toString() || e.id,
      amount:      e.amount,
      category:    e.category,
      date:        e.date,
      description: e.description,
    }));

    const result = await callAIEngine('/anomaly', { expenses: payload });

    if (!Array.isArray(result?.anomalies)) {
      logger.warn('detectAnomalies: unexpected response shape');
      return { anomalies: [], totalScanned: expenses.length, totalFlagged: 0, fallback: true };
    }

    logger.info(
      `detectAnomalies: scanned ${result.totalScanned}, flagged ${result.totalFlagged}`
    );

    return result;

  } catch (err) {
    logger.warn(`detectAnomalies fallback (${err.message}): returning empty`);
    return { anomalies: [], totalScanned: expenses.length, totalFlagged: 0, fallback: true };
  }
};

// predict  —  throws on failure (caller handles)

/**
 * Predict next month's spending from a user's recent expenses.
 * This method DOES throw on failure — the ai.controller catches it
 * and returns a structured 503/504 response to the client.
 *
 * @param {object[]} expenses
 * @returns {Promise<{ prediction: object }>}
 * @throws {AppError}
 */
const predict = async (expenses) => {
  const payload = expenses.map((e) => ({
    amount:   e.amount,
    category: e.category,
    date:     e.date,
  }));

  // Allow extra time — ANN may need to warm up on Render free tier
  const result = await callAIEngine('/predict', { expenses: payload }, 45_000);

  if (!result?.prediction) {
    throw new AppError('AI engine returned an invalid prediction.', 502, 'AI_ENGINE_ERROR');
  }

  logger.info(
    `predict: target=${result.prediction.targetMonth} ` +
    `total=₹${result.prediction.predictedTotal} ` +
    `confidence=${result.prediction.confidence}`
  );

  return result;
};

module.exports = { classify, detectAnomalies, predict };
