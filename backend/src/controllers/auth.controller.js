'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user, store: req.store } });
});
