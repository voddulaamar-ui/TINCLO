/**
 * /api/internal-marketplace — Internal Talent Marketplace
 * Internal job postings, employee mobility, gigs, succession planning.
 */
import express from 'express';
import InternalJob from '../models/internalMarketplace/InternalJob.js';
import InternalApplication from '../models/internalMarketplace/InternalApplication.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

const getOrgId = (req) => req.user.orgId || req.user.organizationId || '';

// ── List internal jobs ───────────────────────────────────────────────────────
router.get('/jobs', async (req, res) => {
  const { type, department, status } = req.query;
  try {
    const filter = { orgId: getOrgId(req), status: status || 'open' };
    if (type) filter.type = type;
    if (department) filter.department = new RegExp(department, 'i');
    const jobs = await InternalJob.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, jobs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Get single job ───────────────────────────────────────────────────────────
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await InternalJob.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ success: false, message: 'Not found.' });
    await InternalJob.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true, job });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Create internal job ──────────────────────────────────────────────────────
router.post('/jobs', async (req, res) => {
  try {
    const job = await InternalJob.create({ ...req.body, orgId: getOrgId(req), createdBy: req.user.userId });
    res.status(201).json({ success: true, job });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Update internal job ──────────────────────────────────────────────────────
router.put('/jobs/:id', async (req, res) => {
  try {
    const job = await InternalJob.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.userId }, req.body, { new: true });
    res.json({ success: true, job });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Apply to internal job ────────────────────────────────────────────────────
router.post('/apply', async (req, res) => {
  const { jobId, coverNote, skills, movementType } = req.body;
  try {
    const existing = await InternalApplication.findOne({ jobId, employeeId: req.user.userId });
    if (existing) return res.status(400).json({ success: false, message: 'Already applied.' });

    const app = await InternalApplication.create({
      orgId: getOrgId(req), jobId, employeeId: req.user.userId,
      employeeName: req.user.name || '', coverNote, skills: skills || [],
      movementType: movementType || 'lateral',
    });
    await InternalJob.findByIdAndUpdate(jobId, { $inc: { applicants: 1 } });
    res.status(201).json({ success: true, application: app });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── My applications ──────────────────────────────────────────────────────────
router.get('/my-applications', async (req, res) => {
  try {
    const apps = await InternalApplication.find({ employeeId: req.user.userId }).populate('jobId', 'title department type status').sort({ createdAt: -1 }).lean();
    res.json({ success: true, applications: apps });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Applications for a job (manager view) ────────────────────────────────────
router.get('/jobs/:id/applications', async (req, res) => {
  try {
    const apps = await InternalApplication.find({ jobId: req.params.id }).sort({ matchScore: -1 }).lean();
    res.json({ success: true, applications: apps });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Update application status ────────────────────────────────────────────────
router.patch('/applications/:id', async (req, res) => {
  try {
    const app = await InternalApplication.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, application: app });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Recommendations (skill-based) ───────────────────────────────────────────
router.get('/recommendations', async (req, res) => {
  try {
    const jobs = await InternalJob.find({ orgId: getOrgId(req), status: 'open' }).lean();
    // Simple skill match — in production use the user's skill profile
    const recommended = jobs.slice(0, 10).map(j => ({ ...j, matchReason: 'Based on your skills and experience' }));
    res.json({ success: true, recommendations: recommended });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Succession planning ──────────────────────────────────────────────────────
router.get('/succession', async (req, res) => {
  try {
    const roles = await InternalJob.find({ orgId: getOrgId(req), isSuccessionRole: true }).lean();
    res.json({ success: true, successionRoles: roles });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
