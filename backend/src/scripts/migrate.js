'use strict';

/**
 * Creates all tables according to current Sequelize models.
 * Usage: `npm run migrate` (with env configured).
 */
const logger = require('../utils/logger');
const { sequelize } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    logger.info('✅ Migration complete');
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed: %s', err.stack || err.message);
    process.exit(1);
  }
})();
