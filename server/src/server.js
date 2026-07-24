const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./db/connect');

let httpServer;

async function start() {
  try {
    await connectDB(env.MONGO_URI);

    httpServer = app.listen(env.PORT, () => {
      console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (err) {
    console.error('Fatal: failed to start server', err);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down...`);
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await disconnectDB();
  console.log('Clean shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
