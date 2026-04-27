'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const SUBSCRIPTION_PLANS = ['BASIC', 'GROWTH', 'PREMIUM'];
const SUBSCRIPTION_STATUS = ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'];

const Store = sequelize.define(
  'Store',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
      validate: { is: /^[0-9+\-\s]{7,15}$/ },
    },
    email: { type: DataTypes.STRING(160), allowNull: true, validate: { isEmail: true } },
    address: { type: DataTypes.STRING(500), allowNull: true },
    gstNumber: { type: DataTypes.STRING(20), allowNull: true },
    subscriptionPlan: {
      type: DataTypes.ENUM(...SUBSCRIPTION_PLANS),
      allowNull: false,
      defaultValue: 'BASIC',
    },
    subscriptionStatus: {
      type: DataTypes.ENUM(...SUBSCRIPTION_STATUS),
      allowNull: false,
      defaultValue: 'TRIAL',
    },
    trialEndsAt: { type: DataTypes.DATE, allowNull: true },
    subscriptionEndsAt: { type: DataTypes.DATE, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'stores',
    indexes: [{ fields: ['phone'] }, { fields: ['subscription_plan'] }],
  }
);

Store.PLANS = SUBSCRIPTION_PLANS;
Store.STATUSES = SUBSCRIPTION_STATUS;

module.exports = Store;
