'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/delivery.service');

exports.list = asyncHandler(async (req, res) => {
  const { status, limit, offset } = req.query;
  const data = await service.list({
    storeId: req.storeId,
    status,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json({ success: true, data });
});

exports.assign = asyncHandler(async (req, res) => {
  const delivery = await service.assign(req.storeId, req.params.orderId, req.body);
  res.status(201).json({ success: true, data: delivery });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, failureReason } = req.body;
  const delivery = await service.updateStatus(req.storeId, req.params.id, status, failureReason);
  res.json({ success: true, data: delivery });
});
