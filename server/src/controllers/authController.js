const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');

const BCRYPT_ROUNDS = 10;
const VALID_ROLES = ['admin', 'member'];

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'email and password are required',
    });
  }

  // passwordHash is `select: false` on the schema — must opt in for compare.
  const user = await User.findOne({ email: String(email).toLowerCase() }).select(
    '+passwordHash'
  );

  // Same 401 for "no such user" and "wrong password" — prevents user enumeration.
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  const token = signToken(user);
  return res.status(200).json({ token, user: user.toPublicJSON() });
}

async function register(req, res) {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'name, email, and password are required',
    });
  }

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `role must be one of: ${VALID_ROLES.join(', ')}`,
    });
  }

  const normalizedEmail = String(email).toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'A user with that email already exists',
    });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: role || 'member',
  });

  return res.status(201).json({ user: user.toPublicJSON() });
}

module.exports = { login, register };
