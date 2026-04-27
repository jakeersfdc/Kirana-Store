'use strict';

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

// Request ID for traceability
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.isProd ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
  })
);

// CORS allowlist
const corsOrigins = config.cors.origins;
const corsOpts = corsOrigins.includes('*')
  ? { origin: true, credentials: true }
  : {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // mobile apps / curl / same-origin
        if (corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    };
app.use(cors(corsOpts));
app.use(compression());

// Preserve raw body (needed for WhatsApp / Razorpay signature verification)
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Logging
morgan.token('id', (req) => req.id);
app.use(
  morgan(
    config.isProd
      ? ':remote-addr :id ":method :url" :status :res[content-length] :response-time ms'
      : 'dev',
    { stream: { write: (msg) => logger.info(msg.trim()) } }
  )
);

// Global limiter (lenient — used for everything not below)
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for /auth (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Try again later.' },
});

// Per-IP limiter for public storefront APIs (anti-scraping)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.publicMax,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(`${config.apiBasePath}/auth`, authLimiter);
app.use(`${config.apiBasePath}/public`, publicLimiter);
app.use(globalLimiter);

// Health & readiness
app.get('/health', (_req, res) => res.json({ status: 'ok', env: config.env, time: new Date().toISOString() }));
app.get('/ready', async (_req, res) => {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    res.json({ status: 'ready' });
  } catch (e) {
    res.status(503).json({ status: 'not-ready', error: e.message });
  }
});

// Friendly routes
app.get('/', (_req, res) => res.redirect('/shop'));
app.get('/shop', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'shop.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// Static assets (fallback)
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  })
);

// API
app.use(config.apiBasePath, routes);

// 404 + error
app.use(notFound);
app.use(errorHandler);

module.exports = app;
