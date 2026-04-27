'use strict';

const Joi = require('joi');

exports.create = Joi.object({
  name: Joi.string().min(1).max(160).required(),
  sku: Joi.string().max(60).allow(null, ''),
  category: Joi.string().max(80).allow(null, ''),
  unit: Joi.string().max(20).default('pcs'),
  price: Joi.number().min(0).precision(2).required(),
  mrp: Joi.number().min(0).precision(2).optional(),
  stock: Joi.number().min(0).default(0),
  lowStockThreshold: Joi.number().min(0).default(5),
  imageUrl: Joi.string().uri().allow(null, ''),
});

exports.update = exports.create.fork(['name', 'price'], (s) => s.optional());

exports.adjust = Joi.object({
  change: Joi.number().invalid(0).required(),
  reason: Joi.string().valid('RESTOCK', 'ADJUSTMENT', 'RETURN', 'WASTAGE').default('ADJUSTMENT'),
  note: Joi.string().max(255).allow(null, ''),
});
