const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const apiRouter = require('./routes');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Security + parsing baseline
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: false }));
  app.use(express.json({ limit: '100kb' }));

  // HTTP request logging (skip in test)
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('tiny'));
  }

  // All app routes under /api
  app.use('/api', apiRouter);

  // 404 for unknown routes
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
  });

  // Central error handler — must be last
  app.use(errorHandler);

  return app;
}

module.exports = createApp();
