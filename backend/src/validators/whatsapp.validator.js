'use strict';

const Joi = require('joi');

exports.sendText = Joi.object({
  toPhone: Joi.string().pattern(/^[0-9+\-\s]{7,15}$/).required(),
  body: Joi.string().min(1).max(4000).required(),
});

exports.paymentReminder = Joi.object({
  customerId: Joi.string().uuid().required(),
});
