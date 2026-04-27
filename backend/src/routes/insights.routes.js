'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/insights.controller');

router.get('/dashboard', ctrl.dashboard);
router.get('/top-products', ctrl.topProducts);
router.get('/low-stock', ctrl.lowStock);
router.get('/customer-frequency', ctrl.customerFrequency);
router.get('/reorder-list', ctrl.reorderList);
router.get('/sales-summary', ctrl.salesSummary);
router.get('/export', ctrl.exportSnapshot);

module.exports = router;
