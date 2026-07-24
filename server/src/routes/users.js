const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const userController = require('../controllers/userController');

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(userController.listUsers)
);

module.exports = router;
