'use strict';

const dayjs = require('dayjs');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Order, OrderItem, Product, Customer } = require('../models');

async function topSellingProducts(storeId, days = 7, limit = 10) {
  const since = dayjs().subtract(days, 'day').toDate();
  const rows = await OrderItem.findAll({
    attributes: [
      'productId',
      'productName',
      [fn('SUM', col('OrderItem.quantity')), 'totalQty'],
      [fn('SUM', col('OrderItem.line_total')), 'totalRevenue'],
    ],
    include: [
      {
        model: Order,
        attributes: [],
        where: { storeId, status: { [Op.ne]: 'CANCELLED' }, placedAt: { [Op.gte]: since } },
      },
    ],
    group: ['OrderItem.product_id', 'OrderItem.product_name'],
    order: [[literal('"totalQty"'), 'DESC']],
    limit,
    raw: true,
  });
  return rows;
}

async function lowStockAlerts(storeId) {
  return Product.findAll({
    where: {
      storeId,
      isActive: true,
      stock: { [Op.lte]: sequelize.col('low_stock_threshold') },
    },
    order: [['stock', 'ASC']],
  });
}

async function customerFrequency(storeId, days = 30, limit = 20) {
  const since = dayjs().subtract(days, 'day').toDate();
  return Order.findAll({
    attributes: [
      'customerId',
      [fn('COUNT', col('Order.id')), 'orderCount'],
      [fn('SUM', col('Order.total_amount')), 'totalSpend'],
    ],
    where: {
      storeId,
      customerId: { [Op.ne]: null },
      status: { [Op.ne]: 'CANCELLED' },
      placedAt: { [Op.gte]: since },
    },
    include: [{ model: Customer, attributes: ['name', 'phone'] }],
    group: ['Order.customer_id', 'Customer.id'],
    order: [[literal('"orderCount"'), 'DESC']],
    limit,
  });
}

async function suggestReorderList(storeId, days = 14, limit = 25) {
  const since = dayjs().subtract(days, 'day').toDate();
  // Products sold recently whose current stock is below threshold
  const sold = await OrderItem.findAll({
    attributes: ['productId', [fn('SUM', col('OrderItem.quantity')), 'soldQty']],
    include: [
      {
        model: Order,
        attributes: [],
        where: { storeId, status: { [Op.ne]: 'CANCELLED' }, placedAt: { [Op.gte]: since } },
      },
      { model: Product, attributes: ['name', 'stock', 'lowStockThreshold', 'unit'] },
    ],
    group: ['OrderItem.product_id', 'Product.id'],
    order: [[literal('"soldQty"'), 'DESC']],
    limit,
  });
  return sold
    .map((r) => r.toJSON())
    .filter((r) => Number(r.Product?.stock) <= Number(r.Product?.lowStockThreshold));
}

async function salesSummary(storeId, { from, to } = {}) {
  const start = from ? new Date(from) : dayjs().startOf('day').toDate();
  const end = to ? new Date(to) : dayjs().endOf('day').toDate();

  const totals = await Order.findOne({
    attributes: [
      [fn('COUNT', col('id')), 'orderCount'],
      [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'revenue'],
      [fn('COALESCE', fn('AVG', col('total_amount')), 0), 'avgOrderValue'],
    ],
    where: { storeId, status: { [Op.ne]: 'CANCELLED' }, placedAt: { [Op.between]: [start, end] } },
    raw: true,
  });

  const byStatus = await Order.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    where: { storeId, placedAt: { [Op.between]: [start, end] } },
    group: ['status'],
    raw: true,
  });

  return { range: { from: start, to: end }, totals, byStatus };
}

async function dashboard(storeId) {
  const [today, week, low, top] = await Promise.all([
    salesSummary(storeId, {}),
    salesSummary(storeId, {
      from: dayjs().subtract(7, 'day').startOf('day').toDate(),
      to: dayjs().endOf('day').toDate(),
    }),
    lowStockAlerts(storeId),
    topSellingProducts(storeId, 7, 5),
  ]);
  return { today, last7Days: week, lowStock: low, topProducts: top };
}

// Shape data for future ML/Salesforce Einstein ingestion
async function exportAnalyticsSnapshot(storeId) {
  const [top, freq, reorder, summary] = await Promise.all([
    topSellingProducts(storeId, 30, 50),
    customerFrequency(storeId, 60, 100),
    suggestReorderList(storeId, 30, 50),
    salesSummary(storeId, {
      from: dayjs().subtract(30, 'day').toDate(),
      to: new Date(),
    }),
  ]);
  return {
    storeId,
    generatedAt: new Date().toISOString(),
    topSellingProducts: top,
    customerFrequency: freq,
    suggestedReorders: reorder,
    salesSummary: summary,
  };
}

module.exports = {
  topSellingProducts,
  lowStockAlerts,
  customerFrequency,
  suggestReorderList,
  salesSummary,
  dashboard,
  exportAnalyticsSnapshot,
};
