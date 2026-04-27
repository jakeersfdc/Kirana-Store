'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenant');
const subscription = require('../services/subscription.service');

const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const customerRoutes = require('./customer.routes');
const orderRoutes = require('./order.routes');
const deliveryRoutes = require('./delivery.routes');
const paymentRoutes = require('./payment.routes');
const insightsRoutes = require('./insights.routes');
const subscriptionRoutes = require('./subscription.routes');
const whatsappRoutes = require('./whatsapp.routes');

// Public
router.use('/auth', authRoutes);
router.use('/public', require('./public.routes'));

// WhatsApp webhook (public — secured by verify token + signature)
router.get('/whatsapp/webhook', require('../controllers/whatsapp.controller').verify);
router.post('/whatsapp/webhook', require('../controllers/whatsapp.controller').receive);

// Authenticated + tenant-scoped
router.use(authenticate, tenantGuard);

router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/payments', paymentRoutes);
router.use('/insights', subscription.requireFeature('analytics'), insightsRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/whatsapp', subscription.requireFeature('whatsapp'), whatsappRoutes);

module.exports = router;
