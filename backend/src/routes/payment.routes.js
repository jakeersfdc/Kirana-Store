'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const validate = require('../middleware/validate');
const schemas = require('../validators/payment.validator');

router.post('/razorpay/order', validate({ body: schemas.createOrder }), ctrl.createRazorpayOrder);
router.post('/razorpay/verify', validate({ body: schemas.verify }), ctrl.verify);

module.exports = router;
