'use strict';

const dayjs = require('dayjs');
const config = require('../config');
const { Store, Order, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const paymentService = require('./payment.service');

function planDetails(plan) {
  const details = config.subscription.plans[plan];
  if (!details) throw ApiError.badRequest('Unknown plan');
  return { plan, ...details };
}

function listPlans() {
  return Object.keys(config.subscription.plans).map((p) => planDetails(p));
}

function computeStatus(store) {
  const now = dayjs();
  if (store.subscriptionStatus === 'TRIAL') {
    if (store.trialEndsAt && now.isAfter(dayjs(store.trialEndsAt))) return 'EXPIRED';
    return 'TRIAL';
  }
  if (store.subscriptionStatus === 'ACTIVE') {
    if (store.subscriptionEndsAt && now.isAfter(dayjs(store.subscriptionEndsAt))) return 'EXPIRED';
    return 'ACTIVE';
  }
  return store.subscriptionStatus;
}

async function getMine(storeId) {
  const store = await Store.findByPk(storeId);
  if (!store) throw ApiError.notFound('Store not found');
  return {
    plan: planDetails(store.subscriptionPlan),
    status: computeStatus(store),
    trialEndsAt: store.trialEndsAt,
    subscriptionEndsAt: store.subscriptionEndsAt,
  };
}

/**
 * Begin a plan upgrade. For paid plans, creates a Razorpay order and
 * returns checkout params; actual activation happens after verify().
 */
async function startUpgrade(storeId, { plan }) {
  const details = planDetails(plan);
  if (details.priceInr === 0) {
    const store = await Store.findByPk(storeId);
    await store.update({
      subscriptionPlan: plan,
      subscriptionStatus: 'ACTIVE',
      subscriptionEndsAt: dayjs().add(30, 'day').toDate(),
    });
    return { free: true, plan: details };
  }
  const checkout = await paymentService.createRazorpayOrder(storeId, {
    amount: details.priceInr,
    purpose: 'SUBSCRIPTION',
  });
  return { free: false, plan: details, checkout };
}

/**
 * After Razorpay verify() marks the subscription payment PAID,
 * call this to activate the plan for 30 days.
 */
async function activateAfterPayment(storeId, { plan }) {
  const store = await Store.findByPk(storeId);
  if (!store) throw ApiError.notFound('Store not found');
  planDetails(plan); // validates
  await store.update({
    subscriptionPlan: plan,
    subscriptionStatus: 'ACTIVE',
    subscriptionEndsAt: dayjs().add(30, 'day').toDate(),
  });
  return getMine(storeId);
}

/**
 * Express middleware-style feature gate.
 * Usage: requireFeature('whatsapp') or requireFeature('analytics')
 */
function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const store = req.store || (await Store.findByPk(req.storeId));
      const status = computeStatus(store);
      if (status === 'EXPIRED') return next(ApiError.forbidden('Subscription expired'));
      const details = planDetails(store.subscriptionPlan);
      if (!details[feature]) {
        return next(ApiError.forbidden(`Feature "${feature}" not available on ${store.subscriptionPlan} plan`));
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Enforce product/order quotas based on plan.
 */
async function enforceQuotas(storeId, kind) {
  const store = await Store.findByPk(storeId);
  const details = planDetails(store.subscriptionPlan);
  if (kind === 'PRODUCT' && details.maxProducts !== -1) {
    const count = await Product.count({ where: { storeId } });
    if (count >= details.maxProducts) {
      throw ApiError.forbidden(`Product limit reached for ${store.subscriptionPlan} plan`);
    }
  }
  if (kind === 'ORDER' && details.maxOrdersPerMonth !== -1) {
    const since = dayjs().startOf('month').toDate();
    const count = await Order.count({ where: { storeId, placedAt: { [require('sequelize').Op.gte]: since } } });
    if (count >= details.maxOrdersPerMonth) {
      throw ApiError.forbidden(`Monthly order limit reached for ${store.subscriptionPlan} plan`);
    }
  }
}

module.exports = {
  listPlans,
  planDetails,
  getMine,
  startUpgrade,
  activateAfterPayment,
  requireFeature,
  enforceQuotas,
  computeStatus,
};
