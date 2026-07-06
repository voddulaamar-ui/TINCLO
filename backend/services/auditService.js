/**
 * Audit service — logs security and admin events to both Winston files and MongoDB.
 * 
 * Usage:
 *   import audit from '../services/auditService.js';
 *   await audit.log('job_created', { userId, jobId: job._id }, req);
 */
import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

const auditService = {
  /**
   * Record an audit event.
   * @param {string} action - Action name (e.g. 'user_login', 'job_deleted')
   * @param {object} data - { userId, targetId, targetType, details }
   * @param {object} [req] - Express request object (for IP and user-agent)
   */
  async log(action, data = {}, req = null) {
    const entry = {
      action,
      userId:     data.userId     || req?.user?.userId || null,
      targetId:   data.targetId   || null,
      targetType: data.targetType || null,
      details:    data.details    || data,
      ip:         req?.ip || req?.connection?.remoteAddress || null,
      userAgent:  req?.get?.('User-Agent') || null,
    };

    // Log to Winston audit file (non-blocking)
    logger.audit(action, entry);

    // Persist to MongoDB (non-blocking, don't fail the request if this fails)
    try {
      await AuditLog.create(entry);
    } catch (err) {
      logger.error('Failed to persist audit log', { action, error: err.message });
    }
  },

  /**
   * Query audit logs (for admin panel).
   */
  async query({ action, userId, page = 1, limit = 50 } = {}) {
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
};

export default auditService;
