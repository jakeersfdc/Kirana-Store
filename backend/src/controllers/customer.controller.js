'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/customer.service');

exports.list = asyncHandler(async (req, res) => {
  const { q, withCredit, limit, offset } = req.query;
  const data = await service.list({
    storeId: req.storeId,
    q,
    withCredit: withCredit === 'true',
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json({ success: true, data });
});

exports.get = asyncHandler(async (req, res) => {
  const c = await service.getById(req.storeId, req.params.id);
  res.json({ success: true, data: c });
});

exports.create = asyncHandler(async (req, res) => {
  const c = await service.create(req.storeId, req.body);
  res.status(201).json({ success: true, data: c });
});

exports.update = asyncHandler(async (req, res) => {
  const c = await service.update(req.storeId, req.params.id, req.body);
  res.json({ success: true, data: c });
});

exports.settleCredit = asyncHandler(async (req, res) => {
  // settle -> reduce credit by amount
  const c = await service.adjustCredit(req.storeId, req.params.id, -Math.abs(req.body.amount));
  res.json({ success: true, data: c });
});
