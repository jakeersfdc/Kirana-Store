'use strict';

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { sequelize } = require('./models');

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection: %s', reason && reason.stack ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception: %s', err.stack || err.message);
  // Let the orchestrator restart us
  setTimeout(() => process.exit(1), 100);
});

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connected (%s)', config.db.dialect);

    // Auto-create/update tables. In production set RUN_MIGRATIONS=true to enable.
    const runMigrations = String(process.env.RUN_MIGRATIONS || '').toLowerCase() === 'true';
    if (!config.isProd || runMigrations) {
      await sequelize.sync();
      logger.info('Models synced');
    }

    const server = app.listen(config.port, () => {
      logger.info('Kirana SaaS API listening on :%d (%s)', config.port, config.env);
    });

    server.keepAliveTimeout = 65 * 1000; // > typical LB idle timeout
    server.headersTimeout = 66 * 1000;

    const shutdown = (signal) => {
      logger.info('Received %s, shutting down gracefully...', signal);
      const force = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 15000).unref();
      server.close(async () => {
        try { await sequelize.close(); } catch (_) { /* ignore */ }
        clearTimeout(force);
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start: %s', err.stack || err.message);
    process.exit(1);
  }
}

start();
