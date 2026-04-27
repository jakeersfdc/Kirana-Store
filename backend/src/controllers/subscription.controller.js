'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/subscription.service');

exports.listPlans = (req, res) => res.json({ success: true, data: service.listPlans() });
exports.mine = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getMine(req.storeId) }));
exports.startUpgrade = asyncHandler(async (req, res) => {
  const data = await service.startUpgrade(req.storeId, req.body);
  res.json({ success: true, data });
});
exports.activate = asyncHandler(async (req, res) => {
  const data = await service.activateAfterPayment(req.storeId, req.body);
  res.json({ success: true, data });
});
