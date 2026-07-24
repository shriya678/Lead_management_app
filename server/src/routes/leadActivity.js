const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const activityController = require('../controllers/activityController');

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(activityController.list));

module.exports = router;
