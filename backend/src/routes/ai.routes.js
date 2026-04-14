'use strict';

/**
 * src/routes/ai.routes.js
 * Mounted at: /api/ai
 *
 * Route map:
 *   POST /api/ai/classify    – on-demand description classification
 *   GET  /api/ai/predict     – ANN next-month spending prediction
 *   GET  /api/ai/anomalies   – stored anomaly records for the user
 *   GET  /api/ai/insights    – aggregated dashboard panel (anomalies + prediction)
 *
 * All routes require a valid JWT access token.
 * The Node service calls the Python engine internally;
 * the client never reaches Python directly.
 */

const router       = require('express').Router();
const { protect }  = require('../middleware/auth');
const aiController = require('../controllers/ai.controller');

// All AI routes require authentication
router.use(protect);

router.post('/classify',  aiController.classify);
router.get('/predict',    aiController.predict);
router.get('/anomalies',  aiController.getAnomalies);
router.get('/insights',   aiController.getInsights);
router.get('/gemini-report', aiController.getGeminiReport);

module.exports = router;
