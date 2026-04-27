'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const { sequelize, Store, User } = require('../models');
const config = require('../config');
const ApiError = require('../utils/ApiError');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, storeId: user.storeId, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Registers a new store + owner user atomically.
 */
async function register({ storeName, ownerName, phone, email, password, address }) {
  const existing = await Store.findOne({ where: { phone } });
  if (existing) throw ApiError.conflict('A store with this phone already exists');

  return sequelize.transaction(async (t) => {
    const trialEndsAt = dayjs().add(config.subscription.trialDays, 'day').toDate();
    const store = await Store.create(
      {
        name: storeName,
        phone,
        email,
        address,
        subscriptionPlan: 'BASIC',
        subscriptionStatus: 'TRIAL',
        trialEndsAt,
      },
      { transaction: t }
    );

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create(
      {
        storeId: store.id,
        name: ownerName,
        phone,
        email,
        role: 'OWNER',
        passwordHash,
      },
      { transaction: t }
    );

    return { store, user, token: signToken(user) };
  });
}

async function login({ phone, password }) {
  const user = await User.scope('withPassword').findOne({ where: { phone, isActive: true } });
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const store = await Store.findByPk(user.storeId);
  if (!store || !store.isActive) throw ApiError.forbidden('Store is inactive');

  user.lastLoginAt = new Date();
  await user.save();

  const safeUser = user.toJSON();
  delete safeUser.passwordHash;

  return { user: safeUser, store, token: signToken(user) };
}

module.exports = { register, login, signToken };
