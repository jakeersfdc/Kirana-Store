'use strict';

const sequelize = require('../db/sequelize');

const Store = require('./Store');
const User = require('./User');
const Customer = require('./Customer');
const Product = require('./Product');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Delivery = require('./Delivery');
const Payment = require('./Payment');
const InventoryMovement = require('./InventoryMovement');
const WhatsAppMessage = require('./WhatsAppMessage');

// --- Associations ---
Store.hasMany(User, { foreignKey: 'storeId', onDelete: 'CASCADE' });
User.belongsTo(Store, { foreignKey: 'storeId' });

Store.hasMany(Customer, { foreignKey: 'storeId', onDelete: 'CASCADE' });
Customer.belongsTo(Store, { foreignKey: 'storeId' });

Store.hasMany(Product, { foreignKey: 'storeId', onDelete: 'CASCADE' });
Product.belongsTo(Store, { foreignKey: 'storeId' });

Store.hasMany(Order, { foreignKey: 'storeId', onDelete: 'CASCADE' });
Order.belongsTo(Store, { foreignKey: 'storeId' });

Customer.hasMany(Order, { foreignKey: 'customerId' });
Order.belongsTo(Customer, { foreignKey: 'customerId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

Order.hasOne(Delivery, { foreignKey: 'orderId', as: 'delivery', onDelete: 'CASCADE' });
Delivery.belongsTo(Order, { foreignKey: 'orderId' });

Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'orderId' });

Store.hasMany(Payment, { foreignKey: 'storeId' });
Payment.belongsTo(Store, { foreignKey: 'storeId' });

Product.hasMany(InventoryMovement, { foreignKey: 'productId' });
InventoryMovement.belongsTo(Product, { foreignKey: 'productId' });

Store.hasMany(InventoryMovement, { foreignKey: 'storeId' });
InventoryMovement.belongsTo(Store, { foreignKey: 'storeId' });

Store.hasMany(WhatsAppMessage, { foreignKey: 'storeId' });
WhatsAppMessage.belongsTo(Store, { foreignKey: 'storeId' });

module.exports = {
  sequelize,
  Store,
  User,
  Customer,
  Product,
  Order,
  OrderItem,
  Delivery,
  Payment,
  InventoryMovement,
  WhatsAppMessage,
};
