const { Router } = require('express');
const healthRouter = require('./health');
const authRouter = require('./auth');
const usersRouter = require('./users');
const leadsRouter = require('./leads');
const publicLeadsRouter = require('./publicLeads');

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/leads', leadsRouter);
router.use('/public/leads', publicLeadsRouter);

module.exports = router;
