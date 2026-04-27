'use strict';

const config = require('../config');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// 404 handler
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  // Sequelize validation / unique constraint
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    status = 422;
    message = 'Database validation failed';
    details = err.errors?.map((e) => ({ path: e.path, message: e.message }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    status = 409;
    message = 'Foreign key constraint violation';
  }

  if (status >= 500) {
    logger.error('Unhandled error: %s', err.stack || err.message);
  } else {
    logger.warn('Handled error [%d]: %s', status, message);
  }

  res.status(status).json({
    success: false,
    error: {
      status,
      message,
      ...(details ? { details } : {}),
      ...(config.env !== 'production' && err.stack ? { stack: err.stack } : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
