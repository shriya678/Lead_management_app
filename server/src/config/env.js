require('dotenv').config();

const required = ['MONGO_URI'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required env var: ${key}. Copy .env.example to .env and fill it in.`
    );
  }
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
