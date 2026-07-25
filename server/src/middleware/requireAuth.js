const { verifyAccessToken } = require('../utils/jwt');

// Reads `Authorization: Bearer <token>`, verifies the ACCESS JWT (not refresh),
// and attaches a minimal user shape to req.user for downstream handlers.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected "Bearer <token>".',
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      name: payload.name,
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    });
  }
}

module.exports = requireAuth;
