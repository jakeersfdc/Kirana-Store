'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    sku: { type: DataTypes.STRING(60), allowNull: true },
    category: { type: DataTypes.STRING(80), allowNull: true },
    unit: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pcs' },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    mrp: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 },
    },
    stock: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    lowStockThreshold: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 5,
      validate: { min: 0 },
    },
    imageUrl: { type: DataTypes.STRING(500), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'products',
    indexes: [
      { fields: ['store_id'] },
      { fields: ['store_id', 'category'] },
      { fields: ['store_id', 'sku'] },
    ],
  }
);

module.exports = Product;
