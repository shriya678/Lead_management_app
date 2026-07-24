// Factory: returns a middleware that lets the request through only when
// req.user.role matches one of the allowed roles. Must be chained AFTER
// requireAuth so req.user is populated.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires role: ${allowedRoles.join(' or ')}`,
      });
    }

    return next();
  };
}

module.exports = requireRole;
