const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const publicLeadsController = require('../controllers/publicLeadsController');

const router = Router();

router.post('/', asyncHandler(publicLeadsController.create));

module.exports = router;
