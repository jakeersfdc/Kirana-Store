'use strict';

const path = require('path');
const fs = require('fs');

// Load NODE_ENV first (without dotenv), then load the matching .env.<env> file if it exists,
// falling back to .env. This lets us keep dev (.env) and prod (.env.production) side-by-side.
const NODE_ENV_EARLY = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV_EARLY}`;
const cwdEnvFile = path.resolve(process.cwd(), envFile);
if (fs.existsSync(cwdEnvFile)) {
  require('dotenv').config({ path: cwdEnvFile });
} else {
  require('dotenv').config();
}

const env = (key, def) => (process.env[key] !== undefined ? process.env[key] : def);
const bool = (v) => String(v).toLowerCase() === 'true';
const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const NODE_ENV = env('NODE_ENV', 'development');
const isProd = NODE_ENV === 'production';

const config = {
  env: NODE_ENV,
  isProd,
  port: int(env('PORT', '4000'), 4000),
  apiBasePath: env('API_BASE_PATH', '/api/v1'),
  appUrl: env('APP_URL', ''),
  trustProxy: int(env('TRUST_PROXY', '1'), 1),

  cors: {
    origins: env('CORS_ORIGINS', '*')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  db: {
    dialect: env('DB_DIALECT', isProd ? 'postgres' : 'sqlite'),
    storage: env('DB_STORAGE', './data/kirana.sqlite'),
    host: env('DB_HOST', 'localhost'),
    port: int(env('DB_PORT', '5432'), 5432),
    name: env('DB_NAME', 'kirana_saas'),
    user: env('DB_USER', 'postgres'),
    password: env('DB_PASSWORD', ''),
    ssl: bool(env('DB_SSL', 'false')),
    poolMax: int(env('DB_POOL_MAX', '10'), 10),
  },

  jwt: {
    secret: env('JWT_SECRET', 'dev_secret_change_me'),
    expiresIn: env('JWT_EXPIRES_IN', '7d'),
  },

  razorpay: {
    keyId: env('RAZORPAY_KEY_ID', ''),
    keySecret: env('RAZORPAY_KEY_SECRET', ''),
    webhookSecret: env('RAZORPAY_WEBHOOK_SECRET', ''),
  },

  whatsapp: {
    apiUrl: env('WHATSAPP_API_URL', 'https://graph.facebook.com/v20.0'),
    phoneNumberId: env('WHATSAPP_PHONE_NUMBER_ID', ''),
    accessToken: env('WHATSAPP_ACCESS_TOKEN', ''),
    verifyToken: env('WHATSAPP_VERIFY_TOKEN', 'verify_me'),
    appSecret: env('WHATSAPP_APP_SECRET', ''),
  },

  rateLimit: {
    windowMs: int(env('RATE_LIMIT_WINDOW_MS', '900000'), 900000),
    max: int(env('RATE_LIMIT_MAX', '300'), 300),
    publicMax: int(env('RATE_LIMIT_PUBLIC_MAX', '60'), 60),
    authMax: int(env('RATE_LIMIT_AUTH_MAX', '10'), 10),
  },

  logLevel: env('LOG_LEVEL', isProd ? 'info' : 'debug'),

  subscription: {
    trialDays: int(env('TRIAL_DAYS', '14'), 14),
    plans: {
      BASIC: { priceInr: 0, maxProducts: 100, maxOrdersPerMonth: 200, whatsapp: false, analytics: false },
      GROWTH: { priceInr: 499, maxProducts: 1000, maxOrdersPerMonth: 2000, whatsapp: true, analytics: true },
      PREMIUM: { priceInr: 1499, maxProducts: -1, maxOrdersPerMonth: -1, whatsapp: true, analytics: true },
    },
  },
};

// --- Production safety checks ---
if (isProd) {
  const errors = [];
  if (!config.jwt.secret || config.jwt.secret === 'dev_secret_change_me' || config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be a strong (>=32 chars) random value');
  }
  if (config.db.dialect === 'postgres' && !config.db.password) {
    errors.push('DB_PASSWORD is required');
  }
  if (config.cors.origins.length === 1 && config.cors.origins[0] === '*') {
    // eslint-disable-next-line no-console
    console.warn('[config] WARNING: CORS_ORIGINS=* in production. Restrict to your domains.');
  }
  if (errors.length) {
    // eslint-disable-next-line no-console
    console.error('FATAL config errors:\n  - ' + errors.join('\n  - '));
    process.exit(1);
  }
}

module.exports = config;
