'use strict';

const { Op } = require('sequelize');
const { sequelize, Product, InventoryMovement } = require('../models');
const ApiError = require('../utils/ApiError');

async function list({ storeId, q, category, lowStock, limit = 50, offset = 0 }) {
  const where = { storeId };
  if (q) where.name = { [Op.iLike]: `%${q}%` };
  if (category) where.category = category;
  if (lowStock === true) where.stock = { [Op.lte]: sequelize.col('low_stock_threshold') };

  const { rows, count } = await Product.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: Math.min(limit, 200),
    offset,
  });
  return { items: rows, total: count };
}

async function getById(storeId, id) {
  const product = await Product.findOne({ where: { id, storeId } });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function create(storeId, payload) {
  return Product.create({ ...payload, storeId });
}

async function update(storeId, id, payload) {
  const product = await getById(storeId, id);
  await product.update(payload);
  return product;
}

async function remove(storeId, id) {
  const product = await getById(storeId, id);
  await product.update({ isActive: false });
  return { id };
}

/**
 * Adjust stock and record an audit trail movement.
 * Use `change` (+/-) e.g. restock = +10, wastage = -2.
 */
async function adjustStock(storeId, id, { change, reason = 'ADJUSTMENT', note, referenceId }, t) {
  const runner = async (transaction) => {
    const product = await Product.findOne({
      where: { id, storeId },
      lock: transaction.LOCK?.UPDATE,
      transaction,
    });
    if (!product) throw ApiError.notFound('Product not found');

    const newStock = Number(product.stock) + Number(change);
    if (newStock < 0) throw ApiError.badRequest(`Insufficient stock for "${product.name}"`);

    product.stock = newStock;
    await product.save({ transaction });

    await InventoryMovement.create(
      { storeId, productId: product.id, change, reason, note, referenceId },
      { transaction }
    );
    return product;
  };
  return t ? runner(t) : sequelize.transaction(runner);
}

async function lowStock(storeId) {
  return Product.findAll({
    where: {
      storeId,
      isActive: true,
      stock: { [Op.lte]: sequelize.col('low_stock_threshold') },
    },
    order: [['stock', 'ASC']],
  });
}

module.exports = { list, getById, create, update, remove, adjustStock, lowStock };
