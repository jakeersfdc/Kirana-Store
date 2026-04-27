'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const USER_ROLES = ['OWNER', 'MANAGER', 'STAFF', 'DELIVERY'];

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    phone: { type: DataTypes.STRING(15), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: true, validate: { isEmail: true } },
    role: { type: DataTypes.ENUM(...USER_ROLES), allowNull: false, defaultValue: 'OWNER' },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'users',
    indexes: [
      { fields: ['store_id'] },
      { unique: true, fields: ['store_id', 'phone'] },
    ],
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
  }
);

User.ROLES = USER_ROLES;

module.exports = User;
