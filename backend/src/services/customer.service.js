'use strict';

const { Op } = require('sequelize');
const { Customer } = require('../models');
const ApiError = require('../utils/ApiError');

async function list({ storeId, q, withCredit, limit = 50, offset = 0 }) {
  const where = { storeId };
  if (q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { phone: { [Op.iLike]: `%${q}%` } },
    ];
  }
  if (withCredit === true) where.creditBalance = { [Op.gt]: 0 };

  const { rows, count } = await Customer.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: Math.min(limit, 200),
    offset,
  });
  return { items: rows, total: count };
}

async function getById(storeId, id) {
  const c = await Customer.findOne({ where: { id, storeId } });
  if (!c) throw ApiError.notFound('Customer not found');
  return c;
}

async function findOrCreateByPhone(storeId, phone, defaults = {}) {
  const [customer] = await Customer.findOrCreate({
    where: { storeId, phone },
    defaults: { storeId, phone, name: defaults.name || `Customer ${phone.slice(-4)}`, ...defaults },
  });
  return customer;
}

async function create(storeId, payload) {
  const existing = await Customer.findOne({ where: { storeId, phone: payload.phone } });
  if (existing) throw ApiError.conflict('Customer with this phone already exists');
  return Customer.create({ ...payload, storeId });
}

async function update(storeId, id, payload) {
  const c = await getById(storeId, id);
  await c.update(payload);
  return c;
}

async function adjustCredit(storeId, id, delta, t) {
  const run = async (transaction) => {
    const c = await Customer.findOne({
      where: { id, storeId },
      lock: transaction.LOCK?.UPDATE,
      transaction,
    });
    if (!c) throw ApiError.notFound('Customer not found');
    const next = Number(c.creditBalance) + Number(delta);
    if (next < 0) throw ApiError.badRequest('Credit balance cannot go negative');
    c.creditBalance = next;
    await c.save({ transaction });
    return c;
  };
  if (t) return run(t);
  const { sequelize } = require('../models');
  return sequelize.transaction(run);
}

module.exports = { list, getById, findOrCreateByPhone, create, update, adjustCredit };
