'use strict';

const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const { Store, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const customerService = require('../services/customer.service');
const orderService = require('../services/order.service');

// List active stores (so a customer can pick / for demo fallback)
exports.listStores = asyncHandler(async (req, res) => {
  const stores = await Store.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'phone', 'address'],
    order: [['name', 'ASC']],
  });
  res.json({ success: true, data: stores });
});

exports.getStore = asyncHandler(async (req, res) => {
  const store = await Store.findOne({
    where: { id: req.params.storeId, isActive: true },
    attributes: ['id', 'name', 'phone', 'address'],
  });
  if (!store) throw ApiError.notFound('Store not found');
  res.json({ success: true, data: store });
});

// Catalogue — list products for a specific store (public)
exports.listProducts = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { q, category } = req.query;
  const where = { storeId, isActive: true };
  if (q) where.name = { [Op.like]: `%${q}%` };
  if (category) where.category = category;
  const products = await Product.findAll({
    where,
    order: [['category', 'ASC'], ['name', 'ASC']],
    limit: 500,
  });
  res.json({ success: true, data: products });
});

exports.listCategories = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const rows = await Product.findAll({
    where: { storeId, isActive: true },
    attributes: ['category'],
    group: ['category'],
    raw: true,
  });
  res.json({ success: true, data: rows.map((r) => r.category).filter(Boolean) });
});

// Place order as a customer (identified by phone)
exports.placeOrder = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { customer, items, deliveryType = 'DELIVERY', paymentMethod = 'CASH', notes, deliveryCharge = 0 } = req.body;

  const store = await Store.findOne({ where: { id: storeId, isActive: true } });
  if (!store) throw ApiError.notFound('Store not found');

  if (!customer?.phone || !customer?.name) {
    throw ApiError.badRequest('Customer name and phone are required');
  }
  const record = await customerService.findOrCreateByPhone(storeId, customer.phone, {
    name: customer.name,
    address: customer.address,
  });

  const order = await orderService.createOrder(storeId, {
    customerId: record.id,
    items,
    deliveryType,
    paymentMethod,
    deliveryCharge,
    source: 'WEB',
    notes,
  });

  // Optional WhatsApp confirmation if configured
  require('../services/whatsapp.service').sendOrderConfirmation(order).catch(() => {});

  res.status(201).json({ success: true, data: order });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const { storeId, orderId } = req.params;
  const { Order, OrderItem, Delivery } = require('../models');
  const order = await Order.findOne({
    where: { id: orderId, storeId },
    include: [{ model: OrderItem, as: 'items' }, { model: Delivery, as: 'delivery' }],
  });
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, data: order });
});
