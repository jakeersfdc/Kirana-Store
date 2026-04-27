'use strict';

const Joi = require('joi');

const phone = Joi.string().pattern(/^[0-9+\-\s]{7,15}$/).required();

exports.register = Joi.object({
  storeName: Joi.string().min(2).max(120).required(),
  ownerName: Joi.string().min(2).max(120).required(),
  phone,
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).max(128).required(),
  address: Joi.string().max(500).optional(),
});

exports.login = Joi.object({
  phone,
  password: Joi.string().min(6).max(128).required(),
});
