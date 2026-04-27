'use strict';

const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.logLevel || (config.isProd ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    config.env === 'production' ? winston.format.json() : winston.format.simple()
  ),
  defaultMeta: { service: 'kirana-saas' },
  transports: [new winston.transports.Console()],
});

module.exports = logger;
