'use strict';

const Joi = require('joi');
const { Delivery } = require('../models');

exports.assign = Joi.object({
  deliveryBoyName: Joi.string().min(1).max(120).required(),
  deliveryBoyPhone: Joi.string().pattern(/^[0-9+\-\s]{7,15}$/).allow(null, ''),
  deliveryCharge: Joi.number().min(0).default(0),
});

exports.updateStatus = Joi.object({
  status: Joi.string().valid(...Delivery.STATUS).required(),
  failureReason: Joi.string().max(255).allow(null, ''),
});
