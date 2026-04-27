'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Joi-based request validator. Usage:
 *   router.post('/', validate({ body: schema }), handler)
 */
module.exports = (schemas) => (req, res, next) => {
  const parts = ['body', 'query', 'params'];
  for (const part of parts) {
    const schema = schemas[part];
    if (!schema) continue;
    const { error, value } = schema.validate(req[part], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      return next(
        ApiError.unprocessable(
          'Validation failed',
          error.details.map((d) => ({ path: d.path.join('.'), message: d.message }))
        )
      );
    }
    req[part] = value;
  }
  next();
};
