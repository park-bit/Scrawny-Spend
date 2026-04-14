'use strict';

/**
 * src/routes/report.routes.js
 * Mounted at: /api/reports
 *
 *   GET /api/reports/monthly/:year/:month  – JSON monthly snapshot
 *   GET /api/reports/export/csv            – CSV download
 */

const router = require('express').Router();
const { protect }      = require('../middleware/auth');
const reportController = require('../controllers/report.controller');

router.use(protect);

router.get('/monthly/:year/:month', reportController.getMonthly);
router.get('/export/csv',           reportController.exportCsv);

module.exports = router;
