const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Two independently-signed tokens so a leaked access token can't be re-used
// as a refresh token (different secret + different verify path).
function signAccessToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    name: user.name,
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

function signRefreshToken(user) {
  const payload = {
    sub: user._id.toString(),
    type: 'refresh',
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
