'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { User, Store } = require('../models');

/**
 * Verifies JWT, attaches req.user and req.store.
 * Enforces tenant isolation: every authenticated request is bound to a storeId.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing access token');

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (e) {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const user = await User.findOne({ where: { id: payload.sub, isActive: true } });
    if (!user) throw ApiError.unauthorized('User no longer active');

    const store = await Store.findOne({ where: { id: user.storeId, isActive: true } });
    if (!store) throw ApiError.forbidden('Store is inactive');

    req.user = user;
    req.store = store;
    req.storeId = store.id;
    next();
  } catch (err) {
    next(err);
  }
}

/** Role-based authorization. Usage: authorize('OWNER', 'MANAGER') */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient role'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
