'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/subscription.controller');
const validate = require('../middleware/validate');
const schemas = require('../validators/subscription.validator');
const { authorize } = require('../middleware/auth');

router.get('/plans', ctrl.listPlans);
router.get('/me', ctrl.mine);
router.post('/upgrade', authorize('OWNER'), validate({ body: schemas.upgrade }), ctrl.startUpgrade);
router.post('/activate', authorize('OWNER'), validate({ body: schemas.upgrade }), ctrl.activate);

module.exports = router;
