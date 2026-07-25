const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

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

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return res.status(200).json({
    accessToken,
    refreshToken,
    user: user.toPublicJSON(),
  });
}

async function refresh(req, res) {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'refreshToken is required',
    });
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token',
    });
  }

  // Reject any non-refresh token (defense in depth if secrets ever get mixed up).
  if (payload.type !== 'refresh') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token',
    });
  }

  // Look up the user to pick up any role/name changes since the refresh was issued.
  const user = await User.findById(payload.sub);
  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'User no longer exists',
    });
  }

  const accessToken = signAccessToken(user);
  return res.status(200).json({ accessToken });
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

module.exports = { login, refresh, register };
