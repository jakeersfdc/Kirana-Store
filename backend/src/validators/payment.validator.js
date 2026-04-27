'use strict';

const Joi = require('joi');

exports.createOrder = Joi.object({
  orderId: Joi.string().uuid().optional(),
  amount: Joi.number().positive().optional(),
  purpose: Joi.string().valid('ORDER', 'SUBSCRIPTION').default('ORDER'),
}).or('orderId', 'amount');

exports.verify = Joi.object({
  razorpayOrderId: Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  razorpaySignature: Joi.string().required(),
});
