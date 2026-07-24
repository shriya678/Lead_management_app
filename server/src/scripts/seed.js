/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../db/connect');
const User = require('../models/User');

const SEED_USERS = [
  {
    name: 'Demo Admin',
    email: 'admin@demo.com',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    name: 'Demo Member',
    email: 'member@demo.com',
    password: 'Member@123',
    role: 'member',
  },
];

async function seed() {
  await connectDB(env.MONGO_URI);

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          name: u.name,
          role: u.role,
          passwordHash,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Upserted: ${doc.email} (${doc.role})`);
  }

  console.log('\nSeed complete. Credentials:');
  SEED_USERS.forEach((u) =>
    console.log(`  ${u.role.padEnd(6)}  ${u.email}  ${u.password}`)
  );

  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
