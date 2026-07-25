const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const authController = require('../controllers/authController');

const router = Router();

router.post('/login', asyncHandler(authController.login));

// Not requireAuth — the access token is likely already expired when this is called.
router.post('/refresh', asyncHandler(authController.refresh));

router.post(
  '/register',
  requireAuth,
  requireRole('admin'),
  asyncHandler(authController.register)
);

module.exports = router;
