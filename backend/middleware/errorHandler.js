/**
 * Global error handler middleware.
 * Returns consistent JSON error responses and hides sensitive info in production.
 */

const isDev = process.env.NODE_ENV !== 'production';

// ── Known error types ────────────────────────────────────────────────────────
const ERROR_MAP = {
  ValidationError:  { status: 400, code: 'VALIDATION_ERROR' },
  CastError:        { status: 400, code: 'INVALID_ID' },
  JsonWebTokenError:{ status: 401, code: 'INVALID_TOKEN' },
  TokenExpiredError:{ status: 401, code: 'TOKEN_EXPIRED' },
  MongoServerError: { status: 400, code: 'DATABASE_ERROR' },
};

// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  // Default values
  let status    = err.statusCode || err.status || 500;
  let message   = err.message || 'Internal server error';
  let errorCode = err.errorCode || 'SERVER_ERROR';

  // Map known error types
  const mapped = ERROR_MAP[err.name];
  if (mapped) {
    status    = mapped.status;
    errorCode = mapped.code;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    status    = 409;
    errorCode = 'DUPLICATE_ENTRY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message   = `A record with this ${field} already exists.`;
  }

  // Mongoose validation errors — flatten
  if (err.name === 'ValidationError' && err.errors) {
    const fields = Object.values(err.errors).map(e => e.message);
    message = fields.join('. ');
  }

  // Hide internals in production
  if (!isDev && status === 500) {
    message = 'Something went wrong. Please try again later.';
  }

  // Log server errors
  if (status >= 500) {
    console.error(`[ERROR ${status}] ${req.method} ${req.originalUrl}:`, err.stack || err);
  }

  res.status(status).json({
    success:   false,
    message,
    errorCode,
    ...(isDev && { stack: err.stack }),
  });
};

export default globalErrorHandler;
