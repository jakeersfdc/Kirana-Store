'use strict';

/**
 * Wraps async route handlers so that rejected promises are forwarded to
 * the Express error middleware instead of crashing the process.
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
