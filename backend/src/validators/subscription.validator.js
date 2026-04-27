'use strict';

const Joi = require('joi');

exports.upgrade = Joi.object({
  plan: Joi.string().valid('BASIC', 'GROWTH', 'PREMIUM').required(),
});
