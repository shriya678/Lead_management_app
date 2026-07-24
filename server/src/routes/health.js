const { Router } = require('express');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

const dbStateLabel = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      status: 'ok',
      db: dbStateLabel[mongoose.connection.readyState] || 'unknown',
      timestamp: new Date().toISOString(),
    });
  })
);

module.exports = router;
