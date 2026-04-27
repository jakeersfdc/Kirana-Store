'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    orderId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    productName: { type: DataTypes.STRING(160), allowNull: false },
    unit: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pcs' },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, validate: { min: 0.001 } },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    lineTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0 } },
  },
  {
    tableName: 'order_items',
    indexes: [{ fields: ['order_id'] }, { fields: ['product_id'] }],
  }
);

module.exports = OrderItem;
