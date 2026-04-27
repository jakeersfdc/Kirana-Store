'use strict';

const { sequelize, Delivery, Order } = require('../models');
const ApiError = require('../utils/ApiError');

async function assign(storeId, orderId, { deliveryBoyName, deliveryBoyPhone, deliveryCharge = 0 }) {
  return sequelize.transaction(async (t) => {
    const order = await Order.findOne({
      where: { id: orderId, storeId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (!['NEW', 'ACCEPTED', 'PACKED'].includes(order.status)) {
      throw ApiError.badRequest(`Cannot assign delivery for order in status ${order.status}`);
    }

    const existing = await Delivery.findOne({ where: { orderId }, transaction: t });
    if (existing) throw ApiError.conflict('Delivery already assigned for this order');

    if (Number(deliveryCharge) > 0 && Number(order.deliveryCharge) === 0) {
      order.deliveryCharge = deliveryCharge;
      order.totalAmount = Number(order.totalAmount) + Number(deliveryCharge);
      await order.save({ transaction: t });
    }
    order.deliveryType = 'DELIVERY';
    await order.save({ transaction: t });

    return Delivery.create(
      {
        storeId,
        orderId,
        deliveryBoyName,
        deliveryBoyPhone,
        deliveryCharge,
        status: 'ASSIGNED',
      },
      { transaction: t }
    );
  });
}

async function updateStatus(storeId, deliveryId, nextStatus, failureReason) {
  return sequelize.transaction(async (t) => {
    const delivery = await Delivery.findOne({
      where: { id: deliveryId, storeId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!delivery) throw ApiError.notFound('Delivery not found');

    const now = new Date();
    const patch = { status: nextStatus };
    if (nextStatus === 'PICKED') patch.pickedAt = now;
    if (nextStatus === 'DELIVERED') patch.deliveredAt = now;
    if (nextStatus === 'FAILED') patch.failureReason = failureReason || 'Unspecified';
    await delivery.update(patch, { transaction: t });

    // Sync order status
    if (nextStatus === 'OUT_FOR_DELIVERY' || nextStatus === 'PICKED') {
      await Order.update(
        { status: 'OUT_FOR_DELIVERY' },
        { where: { id: delivery.orderId, storeId }, transaction: t }
      );
    } else if (nextStatus === 'DELIVERED') {
      const order = await Order.findOne({ where: { id: delivery.orderId, storeId }, transaction: t });
      if (order && order.status !== 'DELIVERED') {
        await order.update(
          {
            status: 'DELIVERED',
            deliveredAt: now,
            paymentStatus: order.paymentMethod === 'CASH' ? 'PAID' : order.paymentStatus,
          },
          { transaction: t }
        );
      }
    }

    return delivery;
  });
}

async function list({ storeId, status, limit = 50, offset = 0 }) {
  const where = { storeId };
  if (status) where.status = status;
  const { rows, count } = await Delivery.findAndCountAll({
    where,
    include: [{ model: Order }],
    order: [['assigned_at', 'DESC']],
    limit: Math.min(limit, 200),
    offset,
  });
  return { items: rows, total: count };
}

module.exports = { assign, updateStatus, list };
