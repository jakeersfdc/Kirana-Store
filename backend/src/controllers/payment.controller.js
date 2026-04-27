'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/payment.service');

exports.createRazorpayOrder = asyncHandler(async (req, res) => {
  const data = await service.createRazorpayOrder(req.storeId, req.body);
  res.status(201).json({ success: true, data });
});

exports.verify = asyncHandler(async (req, res) => {
  const data = await service.verifyPayment(req.storeId, req.body);
  res.json({ success: true, data });
});
