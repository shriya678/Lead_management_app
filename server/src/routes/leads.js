const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const leadsController = require('../controllers/leadsController');
const leadNotesRouter = require('./leadNotes');
const leadActivityRouter = require('./leadActivity');

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(leadsController.list));
router.get('/:id', asyncHandler(leadsController.getOne));
router.patch('/:id', asyncHandler(leadsController.update));
router.patch('/:id/assign', requireRole('admin'), asyncHandler(leadsController.assign));
router.delete('/:id', requireRole('admin'), asyncHandler(leadsController.remove));

router.use('/:id/notes', leadNotesRouter);
router.use('/:id/activity', leadActivityRouter);

module.exports = router;
