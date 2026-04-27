'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/whatsapp.controller');
const validate = require('../middleware/validate');
const schemas = require('../validators/whatsapp.validator');

// Webhook routes (public) are mounted directly in routes/index.js.
// Authenticated (store-scoped) endpoints only:
router.post('/send', validate({ body: schemas.sendText }), ctrl.sendText);
router.post('/reminders/payment', validate({ body: schemas.paymentReminder }), ctrl.sendPaymentReminder);

module.exports = router;
