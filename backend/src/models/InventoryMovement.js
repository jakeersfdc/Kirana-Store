'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

/** Tracks stock movements for audit + future analytics. */
const InventoryMovement = sequelize.define(
  'InventoryMovement',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    change: { type: DataTypes.DECIMAL(12, 3), allowNull: false }, // +ve = in, -ve = out
    reason: {
      type: DataTypes.ENUM('ORDER', 'RESTOCK', 'ADJUSTMENT', 'RETURN', 'WASTAGE'),
      allowNull: false,
    },
    referenceId: { type: DataTypes.UUID, allowNull: true }, // e.g. orderId
    note: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'inventory_movements',
    indexes: [
      { fields: ['store_id'] },
      { fields: ['product_id'] },
      { fields: ['reason'] },
    ],
  }
);

module.exports = InventoryMovement;
