const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Lead = require('../../src/models/Lead');

async function createUser({ name, email, password = 'Test@1234', role = 'member' } = {}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name || `User ${email}`,
    email,
    passwordHash,
    role,
  });
  return { user, plainPassword: password };
}

async function createLead(overrides = {}) {
  return Lead.create({
    name: 'Test Lead',
    email: `lead-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    source: 'website',
    status: 'new',
    ...overrides,
  });
}

module.exports = { createUser, createLead };
