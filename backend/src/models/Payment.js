'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NETBANKING', 'CREDIT', 'RAZORPAY'];
const PAYMENT_STATUS = ['CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'];

const Payment = sequelize.define(
  'Payment',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: true },
    method: { type: DataTypes.ENUM(...PAYMENT_METHODS), allowNull: false },
    status: { type: DataTypes.ENUM(...PAYMENT_STATUS), allowNull: false, defaultValue: 'CREATED' },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0 } },
    currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'INR' },
    gateway: { type: DataTypes.STRING(40), allowNull: true }, // RAZORPAY / MANUAL
    gatewayOrderId: { type: DataTypes.STRING(120), allowNull: true },
    gatewayPaymentId: { type: DataTypes.STRING(120), allowNull: true },
    gatewaySignature: { type: DataTypes.STRING(255), allowNull: true },
    rawResponse: { type: DataTypes.JSON, allowNull: true },
    purpose: {
      type: DataTypes.ENUM('ORDER', 'SUBSCRIPTION'),
      allowNull: false,
      defaultValue: 'ORDER',
    },
  },
  {
    tableName: 'payments',
    indexes: [
      { fields: ['store_id'] },
      { fields: ['order_id'] },
      { fields: ['gateway_order_id'] },
      { fields: ['status'] },
    ],
  }
);

Payment.METHODS = PAYMENT_METHODS;
Payment.STATUS = PAYMENT_STATUS;

module.exports = Payment;
