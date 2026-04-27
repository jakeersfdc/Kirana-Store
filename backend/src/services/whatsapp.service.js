'use strict';

const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { WhatsAppMessage, Store, Customer, Product, Order } = require('../models');
const customerService = require('./customer.service');
const orderService = require('./order.service');

function isConfigured() {
  return Boolean(config.whatsapp.accessToken && config.whatsapp.phoneNumberId);
}

function client() {
  return axios.create({
    baseURL: `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}`,
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
}

async function sendText(toPhone, body, storeId) {
  if (!isConfigured()) {
    logger.warn('WhatsApp not configured; skipping message to %s', toPhone);
    return null;
  }
  try {
    const resp = await client().post('/messages', {
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'text',
      text: { body },
    });
    const waId = resp.data?.messages?.[0]?.id;
    await WhatsAppMessage.create({
      storeId,
      direction: 'OUTBOUND',
      waMessageId: waId,
      toPhone,
      type: 'text',
      body,
      status: 'SENT',
      raw: resp.data,
    });
    return resp.data;
  } catch (err) {
    logger.error('WhatsApp send failed: %s', err.response?.data ? JSON.stringify(err.response.data) : err.message);
    await WhatsAppMessage.create({
      storeId,
      direction: 'OUTBOUND',
      toPhone,
      type: 'text',
      body,
      status: 'FAILED',
      error: err.message,
      raw: err.response?.data,
    }).catch(() => {});
    return null;
  }
}

async function sendOrderConfirmation(order) {
  if (!order?.customerId) return;
  const customer = await Customer.findByPk(order.customerId);
  const store = await Store.findByPk(order.storeId);
  if (!customer?.phone) return;

  const lines = (order.items || []).map((i) => `- ${i.productName} x ${i.quantity} = ₹${i.lineTotal}`).join('\n');
  const body = `Namaste ${customer.name} 🙏\nThank you for your order at *${store.name}*.\nOrder #${order.orderNumber}\n${lines}\nTotal: ₹${order.totalAmount}\nStatus: ${order.status}`;
  return sendText(customer.phone, body, order.storeId);
}

async function sendStatusUpdate(order) {
  if (!order?.customerId) return;
  const customer = await Customer.findByPk(order.customerId);
  if (!customer?.phone) return;
  const body = `Update for order #${order.orderNumber}: *${order.status}* ✅`;
  return sendText(customer.phone, body, order.storeId);
}

async function sendPaymentReminder(customer, amount, storeName) {
  if (!customer?.phone) return;
  const body = `Namaste ${customer.name} 🙏\nThis is a gentle reminder from *${storeName}*. Your pending balance is ₹${amount}. Kindly clear at your earliest convenience. Dhanyavaad!`;
  return sendText(customer.phone, body, customer.storeId);
}

// ----- Webhook: verification (GET) -----
function verifyWebhook(query) {
  if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === config.whatsapp.verifyToken) {
    return query['hub.challenge'];
  }
  return null;
}

// ----- Webhook: signature check (X-Hub-Signature-256) -----
function verifySignature(rawBody, signatureHeader) {
  if (!config.whatsapp.appSecret) return true; // skip when not configured
  if (!signatureHeader) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', config.whatsapp.appSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

/**
 * Parse a message like "1kg rice, 2 milk, 500g sugar" into structured lines.
 * Very tolerant — ignores items it can't match in the store catalogue.
 */
async function parseOrderText(storeId, text) {
  const segments = text
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const products = await Product.findAll({ where: { storeId, isActive: true } });
  const byLower = new Map(products.map((p) => [p.name.toLowerCase(), p]));

  const items = [];
  for (const seg of segments) {
    // Examples: "1kg rice", "2 milk", "500g sugar", "rice 2"
    const m = seg.match(/^\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pcs|pc)?\s*(.+?)\s*$/i) ||
              seg.match(/^\s*(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pcs|pc)?\s*$/i);
    if (!m) continue;
    let qty, name;
    if (/^\s*\d/.test(seg)) {
      qty = parseFloat(m[1]);
      name = m[3];
    } else {
      name = m[1];
      qty = parseFloat(m[2]);
    }
    if (!qty || !name) continue;

    const nameLc = name.toLowerCase().trim();
    const product =
      byLower.get(nameLc) ||
      products.find((p) => p.name.toLowerCase().includes(nameLc) || nameLc.includes(p.name.toLowerCase()));
    if (product) items.push({ productId: product.id, quantity: qty });
  }
  return items;
}

/**
 * Handle incoming WhatsApp messages. If sender is a known customer,
 * attempt to parse and create an order automatically.
 */
async function handleIncoming(payload) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const msg = change?.messages?.[0];
  if (!msg) return;

  const fromPhone = msg.from;
  const text = msg.text?.body || '';
  const businessPhoneId = change?.metadata?.phone_number_id;

  // Store is identified by which phone number received the message.
  // For single-tenant Cloud API setup we fall back to the only configured store.
  const store =
    (await Store.findOne({ where: { /* map phone_number_id -> store if multi */ } })) || null;
  const storeId = store?.id || null;

  const record = await WhatsAppMessage.create({
    storeId,
    direction: 'INBOUND',
    waMessageId: msg.id,
    fromPhone,
    toPhone: businessPhoneId,
    type: msg.type,
    body: text,
    status: 'RECEIVED',
    raw: payload,
  });

  if (!storeId || !text) return record;

  // Map to customer
  const customer = await customerService.findOrCreateByPhone(storeId, fromPhone);

  // Parse and auto-create order when items are recognized
  const items = await parseOrderText(storeId, text);
  if (items.length > 0) {
    try {
      const order = await orderService.createOrder(storeId, {
        customerId: customer.id,
        items,
        source: 'WHATSAPP',
        paymentMethod: 'CREDIT',
      });
      await record.update({ parsedOrderId: order.id });
      await sendOrderConfirmation(order);
    } catch (err) {
      logger.warn('WA auto-order failed: %s', err.message);
      await sendText(fromPhone, `Sorry, we couldn't place your order: ${err.message}`, storeId);
    }
  }

  return record;
}

module.exports = {
  isConfigured,
  sendText,
  sendOrderConfirmation,
  sendStatusUpdate,
  sendPaymentReminder,
  verifyWebhook,
  verifySignature,
  parseOrderText,
  handleIncoming,
};
