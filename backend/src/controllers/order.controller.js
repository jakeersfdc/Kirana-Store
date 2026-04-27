'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/order.service');
const whatsappService = require('../services/whatsapp.service');

exports.create = asyncHandler(async (req, res) => {
  const order = await service.createOrder(req.storeId, req.body);
  // Fire-and-forget confirmation (won't fail the request if WA not configured)
  whatsappService.sendOrderConfirmation(order).catch(() => {});
  res.status(201).json({ success: true, data: order });
});

exports.list = asyncHandler(async (req, res) => {
  const { status, from, to, customerId, limit, offset } = req.query;
  const data = await service.listOrders({
    storeId: req.storeId,
    status,
    from,
    to,
    customerId,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json({ success: true, data });
});

exports.get = asyncHandler(async (req, res) => {
  const order = await service.getOrder(req.storeId, req.params.id);
  res.json({ success: true, data: order });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const order = await service.updateStatus(req.storeId, req.params.id, status, reason);
  whatsappService.sendStatusUpdate(order).catch(() => {});
  res.json({ success: true, data: order });
});
