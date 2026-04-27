'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Ensures every query/mutation is scoped to the authenticated store.
 * Adds req.tenantWhere = { storeId } for convenience, and rejects
 * attempts to pass a different storeId in body/query/params.
 */
module.exports = function tenantGuard(req, res, next) {
  if (!req.storeId) return next(ApiError.unauthorized('Tenant context missing'));

  const offenders = ['storeId', 'store_id'];
  for (const src of [req.body, req.query, req.params]) {
    if (!src) continue;
    for (const key of offenders) {
      if (src[key] !== undefined && String(src[key]) !== String(req.storeId)) {
        return next(ApiError.forbidden('Cross-tenant access blocked'));
      }
    }
  }

  req.tenantWhere = { storeId: req.storeId };
  next();
};
