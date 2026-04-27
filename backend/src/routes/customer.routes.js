'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/customer.controller');
const validate = require('../middleware/validate');
const schemas = require('../validators/customer.validator');

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', validate({ body: schemas.create }), ctrl.create);
router.patch('/:id', validate({ body: schemas.update }), ctrl.update);
router.post('/:id/settle', validate({ body: schemas.settle }), ctrl.settleCredit);

module.exports = router;
