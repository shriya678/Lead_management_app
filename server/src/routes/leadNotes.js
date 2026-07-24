const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const notesController = require('../controllers/notesController');

const router = Router({ mergeParams: true });

router.post('/', asyncHandler(notesController.create));
router.get('/', asyncHandler(notesController.list));

module.exports = router;
