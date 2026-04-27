'use strict';

const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

const dialect = (config.db.dialect || 'postgres').toLowerCase();

let sequelize;
if (dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.db.storage || './data/kirana.sqlite',
    logging: config.env === 'development' ? (msg) => logger.debug(msg) : false,
    define: { underscored: true, freezeTableName: false },
  });
} else {
  sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: config.env === 'development' ? (msg) => logger.debug(msg) : false,
    dialectOptions: config.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    pool: { max: config.db.poolMax || 10, min: 0, idle: 10000, acquire: 30000 },
    define: { underscored: true, freezeTableName: false },
  });
}

module.exports = sequelize;
