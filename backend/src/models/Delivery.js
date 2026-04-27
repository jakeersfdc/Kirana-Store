'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const DELIVERY_STATUS = ['ASSIGNED', 'PICKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

const Delivery = sequelize.define(
  'Delivery',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: false, unique: true },
    deliveryBoyName: { type: DataTypes.STRING(120), allowNull: false },
    deliveryBoyPhone: { type: DataTypes.STRING(15), allowNull: true },
    status: { type: DataTypes.ENUM(...DELIVERY_STATUS), allowNull: false, defaultValue: 'ASSIGNED' },
    assignedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    pickedAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    failureReason: { type: DataTypes.STRING(255), allowNull: true },
    deliveryCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'deliveries',
    indexes: [{ fields: ['store_id'] }, { fields: ['order_id'] }, { fields: ['status'] }],
  }
);

Delivery.STATUS = DELIVERY_STATUS;

module.exports = Delivery;
