/**
 * Security middleware stack for TINCLO backend.
 * Includes: Helmet, CORS, compression, rate limiting, sanitization, HPP.
 */
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// ── Helmet — sets secure HTTP headers ────────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // disabled for dev; enable in prod with proper directives
  crossOriginEmbedderPolicy: false,
});

// ── Compression — gzip API responses ─────────────────────────────────────────
export const compressionMiddleware = compression({
  threshold: 1024, // only compress responses > 1KB
  level: 6,
});

// ── Rate Limiting — general API ──────────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                   // 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.', errorCode: 'RATE_LIMIT_EXCEEDED' },
});

// ── Strict rate limiter — auth endpoints (login, register, forgot) ───────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                    // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Try again in 15 minutes.', errorCode: 'AUTH_RATE_LIMIT' },
});

// ── Very strict limiter — password reset ─────────────────────────────────────
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many password reset requests. Try again in 1 hour.', errorCode: 'RESET_RATE_LIMIT' },
});

// ── NoSQL injection sanitization ─────────────────────────────────────────────
export const sanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY] Sanitized key "${key}" in request from ${req.ip}`);
  },
});

// ── HTTP Parameter Pollution protection ──────────────────────────────────────
export const hppMiddleware = hpp({
  whitelist: ['page', 'limit', 'sort', 'search', 'domain', 'location', 'workMode', 'jobType', 'skills'],
});

// ── XSS protection — strip HTML tags from string fields ──────────────────────
export const xssClean = (req, res, next) => {
  const clean = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        // Strip script tags and event handlers
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
          .replace(/on\w+\s*=\s*'[^']*'/gi, '');
      } else if (typeof obj[key] === 'object') {
        clean(obj[key]);
      }
    }
    return obj;
  };
  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);
  next();
};
