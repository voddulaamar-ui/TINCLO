/**
 * Winston logger configuration.
 * Logs to console (dev) and files (production).
 * 
 * Usage:
 *   import logger from '../utils/logger.js';
 *   logger.info('Server started');
 *   logger.error('Something failed', { error: err.message });
 *   logger.audit('job_created', { userId, jobId });
 */
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '..', 'logs');

const isDev = process.env.NODE_ENV !== 'production';

// ── Log format ───────────────────────────────────────────────────────────────
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// ── Main application logger ──────────────────────────────────────────────────
const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'tinclo-api' },
  transports: [
    // Console — always active
    new winston.transports.Console({
      format: isDev ? consoleFormat : logFormat,
    }),
    // File: combined log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),
    // File: errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// ── Audit logger — separate file for security/admin events ───────────────────
const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'tinclo-audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
    // Also log to console in dev
    ...(isDev ? [new winston.transports.Console({ format: consoleFormat })] : []),
  ],
});

/**
 * Log an audit event (security, admin actions, data changes).
 * @param {string} action - e.g. 'user_registered', 'job_created', 'password_changed'
 * @param {object} details - contextual data (userId, jobId, ip, etc.)
 */
logger.audit = (action, details = {}) => {
  auditLogger.info(action, { action, ...details, auditTimestamp: new Date().toISOString() });
};

export default logger;
