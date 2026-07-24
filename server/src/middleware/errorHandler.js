// Central error responder. Any thrown/next(err) inside async controllers
// (via asyncHandler) lands here and returns a JSON error body.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({
    error: err.name || 'Error',
    message: err.message || 'Something went wrong',
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = errorHandler;
