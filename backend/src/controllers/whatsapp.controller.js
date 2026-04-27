'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/whatsapp.service');
const ApiError = require('../utils/ApiError');

// GET /webhook — verification handshake
exports.verify = (req, res) => {
  const challenge = service.verifyWebhook(req.query);
  if (!challenge) throw ApiError.forbidden('Verification failed');
  res.status(200).send(challenge);
};

// POST /webhook — incoming messages
exports.receive = asyncHandler(async (req, res) => {
  const sig = req.get('X-Hub-Signature-256');
  const raw = req.rawBody || JSON.stringify(req.body);
  if (!service.verifySignature(raw, sig)) {
    throw ApiError.forbidden('Invalid signature');
  }
  // Ack quickly; process async
  res.sendStatus(200);
  service.handleIncoming(req.body).catch(() => {});
});

// Authenticated endpoints (store-scoped)
exports.sendText = asyncHandler(async (req, res) => {
  const { toPhone, body } = req.body;
  const data = await service.sendText(toPhone, body, req.storeId);
  res.json({ success: true, data });
});

exports.sendPaymentReminder = asyncHandler(async (req, res) => {
  const { Customer } = require('../models');
  const customer = await Customer.findOne({ where: { id: req.body.customerId, storeId: req.storeId } });
  if (!customer) throw ApiError.notFound('Customer not found');
  const data = await service.sendPaymentReminder(customer, customer.creditBalance, req.store.name);
  res.json({ success: true, data });
});
