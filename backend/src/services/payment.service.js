'use strict';

const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../config');
const { Payment, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

let rzp = null;
function getClient() {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw ApiError.internal('Razorpay is not configured');
  }
  if (!rzp) {
    rzp = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
  }
  return rzp;
}

/**
 * Create a Razorpay order tied to an internal Order or subscription.
 */
async function createRazorpayOrder(storeId, { orderId, amount, purpose = 'ORDER' }) {
  if (purpose === 'ORDER') {
    const order = await Order.findOne({ where: { id: orderId, storeId } });
    if (!order) throw ApiError.notFound('Order not found');
    amount = Number(order.totalAmount);
  }
  if (!amount || amount <= 0) throw ApiError.badRequest('Invalid amount');

  const client = getClient();
  const rzpOrder = await client.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: { storeId, orderId: orderId || '', purpose },
  });

  const payment = await Payment.create({
    storeId,
    orderId: purpose === 'ORDER' ? orderId : null,
    method: 'RAZORPAY',
    status: 'CREATED',
    amount,
    currency: 'INR',
    gateway: 'RAZORPAY',
    gatewayOrderId: rzpOrder.id,
    purpose,
    rawResponse: rzpOrder,
  });

  return {
    keyId: config.razorpay.keyId,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    razorpayOrderId: rzpOrder.id,
    paymentId: payment.id,
  };
}

/**
 * Verify Razorpay checkout signature. Updates payment + order on success.
 */
async function verifyPayment(storeId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const payment = await Payment.findOne({
    where: { storeId, gatewayOrderId: razorpayOrderId },
  });
  if (!payment) throw ApiError.notFound('Payment not found');

  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expected !== razorpaySignature) {
    await payment.update({ status: 'FAILED', gatewayPaymentId: razorpayPaymentId, gatewaySignature: razorpaySignature });
    throw ApiError.badRequest('Invalid payment signature');
  }

  await payment.update({
    status: 'PAID',
    gatewayPaymentId: razorpayPaymentId,
    gatewaySignature: razorpaySignature,
  });

  if (payment.orderId) {
    const order = await Order.findOne({ where: { id: payment.orderId, storeId } });
    if (order) await order.update({ paymentStatus: 'PAID' });
  }

  logger.info('Payment verified: %s', payment.id);
  return payment;
}

module.exports = { createRazorpayOrder, verifyPayment };
