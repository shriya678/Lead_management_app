// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;

  // Map common Mongoose failures to correct HTTP codes so controllers don't
  // have to duplicate every validation the schema already enforces.
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    status = 400;
  } else if (err.code === 11000) {
    status = 409;
  }

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
