'use strict';

const express = require('express');
const ctrl = require('../controllers/public.controller');

const router = express.Router();

router.get('/stores', ctrl.listStores);
router.get('/stores/:storeId', ctrl.getStore);
router.get('/stores/:storeId/categories', ctrl.listCategories);
router.get('/stores/:storeId/products', ctrl.listProducts);
router.post('/stores/:storeId/orders', ctrl.placeOrder);
router.get('/stores/:storeId/orders/:orderId', ctrl.getOrder);

module.exports = router;
