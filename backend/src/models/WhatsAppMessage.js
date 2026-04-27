'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const WhatsAppMessage = sequelize.define(
  'WhatsAppMessage',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: true },
    direction: { type: DataTypes.ENUM('INBOUND', 'OUTBOUND'), allowNull: false },
    waMessageId: { type: DataTypes.STRING(120), allowNull: true },
    fromPhone: { type: DataTypes.STRING(20), allowNull: true },
    toPhone: { type: DataTypes.STRING(20), allowNull: true },
    type: { type: DataTypes.STRING(30), allowNull: true }, // text, template, etc
    body: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'),
      allowNull: false,
      defaultValue: 'QUEUED',
    },
    parsedOrderId: { type: DataTypes.UUID, allowNull: true },
    raw: { type: DataTypes.JSON, allowNull: true },
    error: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: 'whatsapp_messages',
    indexes: [
      { fields: ['store_id'] },
      { fields: ['wa_message_id'] },
      { fields: ['from_phone'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = WhatsAppMessage;
