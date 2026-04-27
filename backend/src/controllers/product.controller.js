'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/product.service');

exports.list = asyncHandler(async (req, res) => {
  const { q, category, lowStock, limit, offset } = req.query;
  const data = await service.list({
    storeId: req.storeId,
    q,
    category,
    lowStock: lowStock === 'true',
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json({ success: true, data });
});

exports.get = asyncHandler(async (req, res) => {
  const product = await service.getById(req.storeId, req.params.id);
  res.json({ success: true, data: product });
});

exports.create = asyncHandler(async (req, res) => {
  const product = await service.create(req.storeId, req.body);
  res.status(201).json({ success: true, data: product });
});

exports.update = asyncHandler(async (req, res) => {
  const product = await service.update(req.storeId, req.params.id, req.body);
  res.json({ success: true, data: product });
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.storeId, req.params.id);
  res.json({ success: true, data });
});

exports.adjustStock = asyncHandler(async (req, res) => {
  const product = await service.adjustStock(req.storeId, req.params.id, req.body);
  res.json({ success: true, data: product });
});

exports.lowStock = asyncHandler(async (req, res) => {
  const data = await service.lowStock(req.storeId);
  res.json({ success: true, data });
});
