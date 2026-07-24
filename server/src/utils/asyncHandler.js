// Wraps an async route handler so any thrown error is forwarded to the
// central errorHandler middleware. Without this, an unhandled rejection
// inside an async controller would leave the request hanging.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
