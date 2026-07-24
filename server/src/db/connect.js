const mongoose = require('mongoose');

async function connectDB(uri) {
  mongoose.connection.on('connected', () => console.log('Mongo: connected'));
  mongoose.connection.on('error', (err) => console.error('Mongo: error', err));
  mongoose.connection.on('disconnected', () => console.log('Mongo: disconnected'));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
