'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/insights.service');

exports.dashboard = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.dashboard(req.storeId) });
});

exports.topProducts = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days || '7', 10);
  res.json({ success: true, data: await service.topSellingProducts(req.storeId, days) });
});

exports.lowStock = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.lowStockAlerts(req.storeId) });
});

exports.customerFrequency = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  res.json({ success: true, data: await service.customerFrequency(req.storeId, days) });
});

exports.reorderList = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.suggestReorderList(req.storeId) });
});

exports.salesSummary = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.salesSummary(req.storeId, req.query) });
});

exports.exportSnapshot = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.exportAnalyticsSnapshot(req.storeId) });
});
