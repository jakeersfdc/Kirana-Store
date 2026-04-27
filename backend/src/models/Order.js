'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const ORDER_STATUS = ['NEW', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED'];
const DELIVERY_TYPES = ['PICKUP', 'DELIVERY'];
const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NETBANKING', 'CREDIT'];
const PAYMENT_STATUS = ['PENDING', 'PAID', 'PARTIAL', 'FAILED', 'REFUNDED'];
const ORDER_SOURCES = ['POS', 'APP', 'WHATSAPP', 'WEB'];

const Order = sequelize.define(
  'Order',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    customerId: { type: DataTypes.UUID, allowNull: true },
    orderNumber: { type: DataTypes.STRING(32), allowNull: false },
    subTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    tax: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    deliveryCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.ENUM(...ORDER_STATUS), allowNull: false, defaultValue: 'NEW' },
    deliveryType: { type: DataTypes.ENUM(...DELIVERY_TYPES), allowNull: false, defaultValue: 'PICKUP' },
    paymentMethod: { type: DataTypes.ENUM(...PAYMENT_METHODS), allowNull: false, defaultValue: 'CASH' },
    paymentStatus: { type: DataTypes.ENUM(...PAYMENT_STATUS), allowNull: false, defaultValue: 'PENDING' },
    source: { type: DataTypes.ENUM(...ORDER_SOURCES), allowNull: false, defaultValue: 'POS' },
    notes: { type: DataTypes.STRING(500), allowNull: true },
    placedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    acceptedAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'orders',
    indexes: [
      { fields: ['store_id'] },
      { fields: ['store_id', 'status'] },
      { fields: ['store_id', 'customer_id'] },
      { unique: true, fields: ['store_id', 'order_number'] },
      { fields: ['placed_at'] },
    ],
  }
);

Order.STATUS = ORDER_STATUS;
Order.DELIVERY_TYPES = DELIVERY_TYPES;
Order.PAYMENT_METHODS = PAYMENT_METHODS;
Order.PAYMENT_STATUS = PAYMENT_STATUS;
Order.SOURCES = ORDER_SOURCES;

// Legal state transitions (POS-friendly)
Order.TRANSITIONS = {
  NEW: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

module.exports = Order;
