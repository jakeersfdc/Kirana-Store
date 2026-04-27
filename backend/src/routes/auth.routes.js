'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const schemas = require('../validators/auth.validator');

router.post('/register', validate({ body: schemas.register }), ctrl.register);
router.post('/login', validate({ body: schemas.login }), ctrl.login);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
