'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/delivery.controller');
const validate = require('../middleware/validate');
const schemas = require('../validators/delivery.validator');

router.get('/', ctrl.list);
router.post('/orders/:orderId/assign', validate({ body: schemas.assign }), ctrl.assign);
router.patch('/:id/status', validate({ body: schemas.updateStatus }), ctrl.updateStatus);

module.exports = router;
