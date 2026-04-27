'use strict';

const Joi = require('joi');

const phone = Joi.string().pattern(/^[0-9+\-\s]{7,15}$/);

exports.create = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  phone: phone.required(),
  address: Joi.string().max(500).allow(null, ''),
  creditLimit: Joi.number().min(0).default(0),
  notes: Joi.string().max(500).allow(null, ''),
});

exports.update = Joi.object({
  name: Joi.string().min(1).max(120),
  phone,
  address: Joi.string().max(500).allow(null, ''),
  creditLimit: Joi.number().min(0),
  notes: Joi.string().max(500).allow(null, ''),
  isActive: Joi.boolean(),
}).min(1);

exports.settle = Joi.object({
  amount: Joi.number().positive().required(),
});
