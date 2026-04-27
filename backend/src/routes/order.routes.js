'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/order.controller');
const validate = require('../middleware/validate');
const schemas = require('../validators/order.validator');

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', validate({ body: schemas.create }), ctrl.create);
router.patch('/:id/status', validate({ body: schemas.updateStatus }), ctrl.updateStatus);

module.exports = router;
