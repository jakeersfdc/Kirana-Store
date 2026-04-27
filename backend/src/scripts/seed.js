'use strict';

const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const logger = require('../utils/logger');
const { sequelize, Store, User, Product, Customer } = require('../models');
const config = require('../config');

async function runSeed({ skipSync = false } = {}) {
  if (!skipSync) {
    await sequelize.sync({ alter: true });
  }
  const phone = '+919999999999';
    let store = await Store.findOne({ where: { phone } });
    if (!store) {
      store = await Store.create({
        name: 'Demo Kirana Store',
        phone,
        email: 'demo@kirana.test',
        address: '123 Market Street',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: dayjs().add(config.subscription.trialDays, 'day').toDate(),
        subscriptionEndsAt: dayjs().add(30, 'day').toDate(),
      });
    }

    const exists = await User.findOne({ where: { storeId: store.id, phone } });
    if (!exists) {
      await User.create({
        storeId: store.id,
        name: 'Demo Owner',
        phone,
        role: 'OWNER',
        passwordHash: await bcrypt.hash('password123', 10),
      });
    }

    const sampleProducts = [
      { name: 'Basmati Rice', category: 'Grains', unit: 'kg', price: 85, stock: 100, lowStockThreshold: 10 },
      { name: 'Toor Dal', category: 'Pulses', unit: 'kg', price: 140, stock: 50, lowStockThreshold: 8 },
      { name: 'Sugar', category: 'Staples', unit: 'kg', price: 45, stock: 80, lowStockThreshold: 10 },
      { name: 'Milk', category: 'Dairy', unit: 'l', price: 60, stock: 40, lowStockThreshold: 5 },
      { name: 'Refined Oil', category: 'Oils', unit: 'l', price: 150, stock: 30, lowStockThreshold: 5 },
      { name: 'Parle-G Biscuit', category: 'Snacks', unit: 'pcs', price: 10, stock: 200, lowStockThreshold: 20 },
    ];
    for (const p of sampleProducts) {
      await Product.findOrCreate({ where: { storeId: store.id, name: p.name }, defaults: { ...p, storeId: store.id } });
    }

    await Customer.findOrCreate({
      where: { storeId: store.id, phone: '+919876543210' },
      defaults: { storeId: store.id, name: 'Ramesh Kumar', phone: '+919876543210', creditLimit: 2000 },
    });

  logger.info('✅ Seed complete. Login: phone=%s password=password123', phone);
  return { store, phone };
}

module.exports = { runSeed };

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Seed failed: %s', err.stack || err.message);
      process.exit(1);
    });
}
