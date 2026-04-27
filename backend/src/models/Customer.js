'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Customer = sequelize.define(
  'Customer',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    phone: { type: DataTypes.STRING(15), allowNull: false },
    address: { type: DataTypes.STRING(500), allowNull: true },
    creditBalance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    creditLimit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    notes: { type: DataTypes.STRING(500), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'customers',
    indexes: [
      { fields: ['store_id'] },
      { unique: true, fields: ['store_id', 'phone'] },
    ],
  }
);

module.exports = Customer;
