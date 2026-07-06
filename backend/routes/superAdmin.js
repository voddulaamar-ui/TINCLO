/**
 * /api/super-admin — Platform-wide admin console
 * All routes require admin role.
 */
import express from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import Organization from '../models/Organization.js';
import Subscription from '../models/saas/Subscription.js';
import Payment from '../models/saas/Payment.js';
import Report from '../models/admin/Report.js';
import SecurityEvent from '../models/admin/SecurityEvent.js';
import SystemSettings from '../models/admin/SystemSettings.js';
import VerificationRequest from '../models/admin/VerificationRequest.js';
import FeatureFlag from '../models/admin/FeatureFlag.js';
import ContentPage from '../models/admin/ContentPage.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import cache from '../utils/cache.js';

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

// ══════════════════════════════════════════════════════════════════════════════
// 1. DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const ck = 'super-admin:dashboard';
    const cached = cache.get(ck);
    if (cached) return res.json(cached);

    const [users, orgs, jobs, apps, subs, payments, reports] = await Promise.all([
      User.countDocuments(),
      Organization.countDocuments(),
      Job.countDocuments(),
      Match.countDocuments({ applied: true }),
      Subscription.countDocuments({ status: 'active' }),
      Payment.find({ status: 'success' }).select('amount').lean(),
      Report.countDocuments({ status: 'open' }),
    ]);
    const revenue = payments.reduce((s, p) => s + p.amount, 0);
    const candidates = await User.countDocuments({ role: { $in: ['user', 'candidate'] } });
    const recruiters = await User.countDocuments({ role: 'recruiter' });
    const activeJobs = await Job.countDocuments({ status: 'open' });
    const dau = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 86400000) } });

    const result = {
      success: true,
      dashboard: { users, candidates, recruiters, orgs, jobs, activeJobs, applications: apps, activeSubscriptions: subs, revenue, dau, openReports: reports },
    };
    cache.set(ck, result, 60);
    res.json(result);
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. SYSTEM SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/settings', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne({ key: 'global' }).lean();
    if (!settings) settings = {};
    res.json({ success: true, settings });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await SystemSettings.findOneAndUpdate(
      { key: 'global' },
      { ...req.body, key: 'global', updatedBy: req.user.userId },
      { upsert: true, new: true }
    );
    res.json({ success: true, settings });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. FEATURE FLAGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/feature-flags', async (req, res) => {
  try {
    const flags = await FeatureFlag.find().sort({ category: 1, key: 1 }).lean();
    res.json({ success: true, flags });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/feature-flags/:key', async (req, res) => {
  try {
    const flag = await FeatureFlag.findOneAndUpdate(
      { key: req.params.key },
      { ...req.body, key: req.params.key, updatedBy: req.user.userId },
      { upsert: true, new: true }
    );
    res.json({ success: true, flag });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. CONTENT PAGES (CMS)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/content', async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    const pages = await ContentPage.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, pages });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/content', async (req, res) => {
  try {
    const page = await ContentPage.create({ ...req.body, author: req.user.userId });
    res.status(201).json({ success: true, page });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/content/:id', async (req, res) => {
  try {
    const page = await ContentPage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, page });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/content/:id', async (req, res) => {
  try { await ContentPage.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. VERIFICATION REQUESTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/verifications', async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const requests = await VerificationRequest.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, requests });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/verifications/:id', async (req, res) => {
  const { status, notes, rejectionReason } = req.body;
  try {
    const update = { status, reviewedBy: req.user.userId, reviewedAt: new Date() };
    if (notes) update.notes = notes;
    if (rejectionReason) update.rejectionReason = rejectionReason;
    const vr = await VerificationRequest.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, request: vr });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. REPORTS & ABUSE
// ══════════════════════════════════════════════════════════════════════════════

router.get('/reports', async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, reports });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/reports/:id', async (req, res) => {
  const { status, resolution, assignedTo } = req.body;
  try {
    const update = {};
    if (status) update.status = status;
    if (resolution) update.resolution = resolution;
    if (assignedTo) update.assignedTo = assignedTo;
    if (status === 'resolved') update.resolvedAt = new Date();
    const report = await Report.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, report });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. SECURITY EVENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/security', async (req, res) => {
  try {
    const { severity, resolved } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    const events = await SecurityEvent.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, events });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/security/:id/resolve', async (req, res) => {
  try {
    await SecurityEvent.findByIdAndUpdate(req.params.id, { resolved: true, resolvedBy: req.user.userId, resolvedAt: new Date() });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. AUDIT LOGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/audit-logs', async (req, res) => {
  try {
    const { action, userId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json(paginatedResponse(logs, total, page, limit));
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. SYSTEM HEALTH
// ══════════════════════════════════════════════════════════════════════════════

router.get('/health', async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const dbStatus = (await import('mongoose')).default.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      success: true,
      health: {
        status: 'operational',
        uptime: Math.floor(process.uptime()),
        database: dbStatus,
        memory: { rss: `${Math.round(mem.rss / 1048576)}MB`, heapUsed: `${Math.round(mem.heapUsed / 1048576)}MB` },
        nodeVersion: process.version,
        platform: process.platform,
        cpu: process.cpuUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. JOB MODERATION
// ══════════════════════════════════════════════════════════════════════════════

router.get('/jobs', async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [{ title: new RegExp(search, 'i') }, { company: new RegExp(search, 'i') }];
    const [jobs, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('title company status location createdAt postedBy').lean(),
      Job.countDocuments(filter),
    ]);
    res.json(paginatedResponse(jobs, total, page, limit));
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/jobs/:id/moderate', async (req, res) => {
  const { action } = req.body; // 'approve', 'reject', 'flag', 'archive', 'feature'
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (action === 'reject' || action === 'archive') job.status = 'closed';
    await job.save();
    await AuditLog.create({ action: `job_${action}`, userId: req.user.userId, targetId: job._id, targetType: 'Job', ip: req.ip });
    res.json({ success: true, message: `Job ${action}ed.` });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. DATA EXPORT
// ══════════════════════════════════════════════════════════════════════════════

router.get('/export/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const models = { users: User, jobs: Job, organizations: Organization };
    const Model = models[collection];
    if (!Model) return res.status(400).json({ success: false, message: `Unknown collection: ${collection}` });
    const data = await Model.find().limit(1000).lean();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${collection}-export.json"`);
    res.json({ success: true, count: data.length, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
