const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
