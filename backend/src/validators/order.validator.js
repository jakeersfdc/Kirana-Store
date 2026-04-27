'use strict';

const Joi = require('joi');
const { Order } = require('../models');

exports.create = Joi.object({
  customerId: Joi.string().uuid().allow(null),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        quantity: Joi.number().positive().required(),
        price: Joi.number().min(0).optional(),
      })
    )
    .min(1)
    .required(),
  deliveryType: Joi.string().valid(...Order.DELIVERY_TYPES).default('PICKUP'),
  deliveryCharge: Joi.number().min(0).default(0),
  paymentMethod: Joi.string().valid(...Order.PAYMENT_METHODS).default('CASH'),
  discount: Joi.number().min(0).default(0),
  tax: Joi.number().min(0).default(0),
  source: Joi.string().valid(...Order.SOURCES).default('POS'),
  notes: Joi.string().max(500).allow(null, ''),
});

exports.updateStatus = Joi.object({
  status: Joi.string().valid(...Order.STATUS).required(),
  reason: Joi.string().max(255).allow(null, ''),
});
