'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const validate = require('../middleware/validate');
const schemas = require('../validators/product.validator');
const { authorize } = require('../middleware/auth');

router.get('/', ctrl.list);
router.get('/low-stock', ctrl.lowStock);
router.get('/:id', ctrl.get);
router.post('/', authorize('OWNER', 'MANAGER'), validate({ body: schemas.create }), ctrl.create);
router.patch('/:id', authorize('OWNER', 'MANAGER'), validate({ body: schemas.update }), ctrl.update);
router.delete('/:id', authorize('OWNER', 'MANAGER'), ctrl.remove);
router.post('/:id/adjust', authorize('OWNER', 'MANAGER'), validate({ body: schemas.adjust }), ctrl.adjustStock);

module.exports = router;
