/**
 * Request validation middleware using express-validator.
 * Provides reusable validation chains for common endpoints.
 */
import { body, query, validationResult } from 'express-validator';

// ── Run validators and return 400 if any fail ────────────────────────────────
export const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success:   false,
      message:   errors.array().map(e => e.msg).join('. '),
      errorCode: 'VALIDATION_ERROR',
      errors:    errors.array(),
    });
  }
  next();
};

// ── Password strength rules ──────────────────────────────────────────────────
export const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
  .matches(/\d/).withMessage('Password must contain a number')
  .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character');

// ── Signup validation ────────────────────────────────────────────────────────
export const validateSignup = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  passwordRules,
  body('role').optional().isIn(['candidate', 'recruiter']).withMessage('Role must be candidate or recruiter'),
  runValidation,
];

// ── Login validation ─────────────────────────────────────────────────────────
export const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  runValidation,
];

// ── Create Job validation ────────────────────────────────────────────────────
export const validateCreateJob = [
  body('title').trim().notEmpty().withMessage('Job title is required').isLength({ max: 200 }),
  body('company').trim().notEmpty().withMessage('Company name is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('salary').optional().isString(),
  body('workMode').optional().isIn(['Remote', 'Hybrid', 'Onsite', '']),
  body('jobType').optional().isString(),
  body('deadline').optional().isISO8601().withMessage('Deadline must be a valid date'),
  runValidation,
];

// ── Pagination query validation ──────────────────────────────────────────────
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  runValidation,
];

// ── Forgot password ──────────────────────────────────────────────────────────
export const validateForgotPassword = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  runValidation,
];

// ── Reset password ───────────────────────────────────────────────────────────
export const validateResetPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),
  passwordRules.optional(),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),
  runValidation,
];
