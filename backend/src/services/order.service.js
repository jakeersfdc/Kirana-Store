'use strict';

const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { sequelize, Order, OrderItem, Product, Customer, Delivery } = require('../models');
const productService = require('./product.service');
const customerService = require('./customer.service');
const ApiError = require('../utils/ApiError');

function generateOrderNumber() {
  const d = dayjs().format('YYMMDD');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KIR-${d}-${rand}`;
}

/**
 * Create an order with full business logic:
 * - Validates products/stock
 * - Computes totals
 * - Decrements stock (atomic, locked)
 * - Creates OrderItems
 * - Handles CREDIT payments (udhaar) by adjusting customer credit
 */
async function createOrder(storeId, payload) {
  const {
    customerId,
    items,
    deliveryType = 'PICKUP',
    deliveryCharge = 0,
    paymentMethod = 'CASH',
    discount = 0,
    tax = 0,
    source = 'POS',
    notes,
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Order must contain at least one item');
  }

  return sequelize.transaction(async (t) => {
    // Validate customer (optional) belongs to store
    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ where: { id: customerId, storeId }, transaction: t });
      if (!customer) throw ApiError.badRequest('Invalid customer');
    }

    // Fetch & lock products
    const productIds = items.map((i) => i.productId);
    const products = await Product.findAll({
      where: { id: productIds, storeId, isActive: true },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    if (byId.size !== new Set(productIds).size) {
      throw ApiError.badRequest('One or more products are invalid');
    }

    // Build line items & decrement stock
    let subTotal = 0;
    const orderItemsData = [];
    for (const line of items) {
      const p = byId.get(line.productId);
      const qty = Number(line.quantity);
      if (!qty || qty <= 0) throw ApiError.badRequest(`Invalid quantity for ${p.name}`);
      if (Number(p.stock) < qty) {
        throw ApiError.badRequest(`Out of stock: ${p.name} (available ${p.stock})`);
      }
      const price = line.price !== undefined ? Number(line.price) : Number(p.price);
      const lineTotal = Number((price * qty).toFixed(2));
      subTotal += lineTotal;

      p.stock = Number(p.stock) - qty;
      await p.save({ transaction: t });

      orderItemsData.push({
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        quantity: qty,
        price,
        lineTotal,
      });
    }

    subTotal = Number(subTotal.toFixed(2));
    const totalAmount = Number(
      (subTotal - Number(discount) + Number(tax) + Number(deliveryCharge)).toFixed(2)
    );
    if (totalAmount < 0) throw ApiError.badRequest('Invalid totals (negative)');

    const isCredit = paymentMethod === 'CREDIT';
    if (isCredit && !customer) {
      throw ApiError.badRequest('Credit (udhaar) requires a customer');
    }
    if (isCredit && Number(customer.creditLimit) > 0) {
      const projected = Number(customer.creditBalance) + totalAmount;
      if (projected > Number(customer.creditLimit)) {
        throw ApiError.badRequest('Customer credit limit exceeded');
      }
    }

    const order = await Order.create(
      {
        storeId,
        customerId: customer ? customer.id : null,
        orderNumber: generateOrderNumber(),
        subTotal,
        discount,
        tax,
        deliveryCharge,
        totalAmount,
        status: 'NEW',
        deliveryType,
        paymentMethod,
        paymentStatus: isCredit ? 'PENDING' : paymentMethod === 'CASH' ? 'PENDING' : 'PENDING',
        source,
        notes,
        placedAt: new Date(),
      },
      { transaction: t }
    );

    await OrderItem.bulkCreate(
      orderItemsData.map((i) => ({ ...i, orderId: order.id })),
      { transaction: t }
    );

    // Record inventory movements
    const { InventoryMovement } = require('../models');
    await InventoryMovement.bulkCreate(
      orderItemsData.map((i) => ({
        storeId,
        productId: i.productId,
        change: -i.quantity,
        reason: 'ORDER',
        referenceId: order.id,
      })),
      { transaction: t }
    );

    // Credit sale -> increase customer creditBalance
    if (isCredit) {
      await customerService.adjustCredit(storeId, customer.id, totalAmount, t);
    }

    return Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }, { model: Customer }],
      transaction: t,
    });
  });
}

async function listOrders({ storeId, status, from, to, customerId, limit = 50, offset = 0 }) {
  const where = { storeId };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (from || to) {
    where.placedAt = {};
    if (from) where.placedAt[Op.gte] = new Date(from);
    if (to) where.placedAt[Op.lte] = new Date(to);
  }
  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [{ model: Customer }, { model: OrderItem, as: 'items' }],
    order: [['placed_at', 'DESC']],
    limit: Math.min(limit, 200),
    offset,
  });
  return { items: rows, total: count };
}

async function getOrder(storeId, id) {
  const order = await Order.findOne({
    where: { id, storeId },
    include: [{ model: OrderItem, as: 'items' }, { model: Customer }, { model: Delivery, as: 'delivery' }],
  });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

function assertTransition(from, to) {
  const allowed = Order.TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(`Invalid status transition: ${from} -> ${to}`);
  }
}

async function updateStatus(storeId, id, nextStatus, reason) {
  return sequelize.transaction(async (t) => {
    const order = await Order.findOne({
      where: { id, storeId },
      lock: t.LOCK.UPDATE,
      transaction: t,
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) throw ApiError.notFound('Order not found');

    assertTransition(order.status, nextStatus);

    const patch = { status: nextStatus };
    const now = new Date();
    if (nextStatus === 'ACCEPTED') patch.acceptedAt = now;
    if (nextStatus === 'DELIVERED') {
      patch.deliveredAt = now;
      if (order.paymentMethod === 'CASH') patch.paymentStatus = 'PAID';
    }
    if (nextStatus === 'CANCELLED' || nextStatus === 'REJECTED') {
      patch.cancelledAt = now;
      patch.notes = reason ? `${order.notes || ''}\nCancel reason: ${reason}`.trim() : order.notes;

      // Restore stock
      const { Product, InventoryMovement } = require('../models');
      for (const item of order.items) {
        const p = await Product.findOne({
          where: { id: item.productId, storeId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (p) {
          p.stock = Number(p.stock) + Number(item.quantity);
          await p.save({ transaction: t });
          await InventoryMovement.create(
            {
              storeId,
              productId: p.id,
              change: Number(item.quantity),
              reason: 'RETURN',
              referenceId: order.id,
              note: `Order ${order.orderNumber} ${nextStatus}`,
            },
            { transaction: t }
          );
        }
      }
      // Reverse customer credit if it was an udhaar sale
      if (order.paymentMethod === 'CREDIT' && order.customerId) {
        await customerService.adjustCredit(storeId, order.customerId, -Number(order.totalAmount), t);
      }
    }

    await order.update(patch, { transaction: t });
    return order;
  });
}

module.exports = { createOrder, listOrders, getOrder, updateStatus };
