/**
 * /api/bi-studio — Business Intelligence Studio (Power BI–style)
 * Dashboard builder, datasets, charts, reports, alerts, exports, AI insights.
 */
import express from 'express';
import BiDashboard from '../models/biStudio/BiDashboard.js';
import BiScheduledReport from '../models/biStudio/BiScheduledReport.js';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import aiService from '../services/aiService.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ DASHBOARDS ══════════

router.get('/dashboards', async (req, res) => {
  try {
    const { status, favorite } = req.query;
    const filter = { $or: [{ userId: req.user.userId }, { sharedWith: req.user.userId }, { permissions: 'public' }] };
    if (status) filter.status = status;
    if (favorite === 'true') filter.isFavorite = true;
    const dashboards = await BiDashboard.find(filter).select('-widgets').sort({ updatedAt: -1 }).lean();
    res.json({ success: true, dashboards });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/dashboards', async (req, res) => {
  try {
    const dashboard = await BiDashboard.create({ userId: req.user.userId, organizationId: req.body.organizationId || null, ...req.body });
    res.status(201).json({ success: true, dashboard });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/dashboards/:id', async (req, res) => {
  try {
    const d = await BiDashboard.findById(req.params.id).lean();
    if (!d) return res.status(404).json({ success: false, message: 'Dashboard not found.' });
    res.json({ success: true, dashboard: d });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/dashboards/:id', async (req, res) => {
  try {
    const d = await BiDashboard.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, req.body, { new: true });
    res.json({ success: true, dashboard: d });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/dashboards/:id', async (req, res) => {
  try { await BiDashboard.deleteOne({ _id: req.params.id, userId: req.user.userId }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/dashboards/:id/publish', async (req, res) => {
  try {
    const d = await BiDashboard.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, { status: 'published' }, { new: true });
    res.json({ success: true, dashboard: d });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/dashboards/:id/favorite', async (req, res) => {
  try {
    const d = await BiDashboard.findById(req.params.id);
    if (!d) return res.status(404).json({ success: false, message: 'Not found.' });
    d.isFavorite = !d.isFavorite;
    await d.save();
    res.json({ success: true, isFavorite: d.isFavorite });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/dashboards/:id/share', async (req, res) => {
  const { sharedWith, permissions } = req.body;
  try {
    const d = await BiDashboard.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, { sharedWith: sharedWith || [], permissions: permissions || 'private' }, { new: true });
    res.json({ success: true, dashboard: d });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ TEMPLATES ══════════

router.get('/templates', async (req, res) => {
  try {
    const templates = await BiDashboard.find({ isTemplate: true, status: 'published' }).select('-widgets').lean();
    res.json({ success: true, templates });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/dashboards/from-template/:templateId', async (req, res) => {
  try {
    const tpl = await BiDashboard.findById(req.params.templateId).lean();
    if (!tpl) return res.status(404).json({ success: false, message: 'Template not found.' });
    const { _id, userId, isTemplate, status, ...rest } = tpl;
    const d = await BiDashboard.create({ ...rest, userId: req.user.userId, isTemplate: false, status: 'draft', name: req.body.name || tpl.name });
    res.status(201).json({ success: true, dashboard: d });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ DATA QUERIES ══════════

router.post('/query', async (req, res) => {
  const { source, filters, aggregation, limit } = req.body;
  try {
    // Simplified query engine — routes to appropriate model
    const models = { jobs: Job, candidates: User, applications: Match };
    const Model = models[source];
    if (!Model) return res.status(400).json({ success: false, message: `Unknown data source: ${source}` });

    let query = Model.find(filters || {});
    if (limit) query = query.limit(Math.min(limit, 500));
    const data = await query.select('-password').lean();

    res.json({ success: true, data, count: data.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SCHEDULED REPORTS ══════════

router.get('/reports/scheduled', async (req, res) => {
  try {
    const reports = await BiScheduledReport.find({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, reports });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/reports/scheduled', async (req, res) => {
  try {
    const report = await BiScheduledReport.create({ userId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, report });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/reports/scheduled/:id', async (req, res) => {
  try { await BiScheduledReport.deleteOne({ _id: req.params.id, userId: req.user.userId }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ AI INSIGHTS ══════════

router.post('/ai-insights', async (req, res) => {
  try {
    const { context, question } = req.body;
    const result = await aiService.chatAssistant({ message: question || 'Summarize key recruitment metrics and trends.', context: context || '', role: 'admin' });
    res.json({ success: true, insight: result.response });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/ai-dashboard', async (req, res) => {
  try {
    const { description } = req.body;
    const prompt = `Generate a dashboard specification as JSON for: "${description}". Return JSON: { name, widgets: [{ type, title, chartType, dataSource }] }`;
    const result = await aiService.chatAssistant({ message: prompt, role: 'admin' });
    let spec;
    try { spec = JSON.parse(result.response); } catch { spec = { name: description, widgets: [] }; }
    res.json({ success: true, specification: spec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ALERTS ══════════

router.post('/alerts', async (req, res) => {
  // Placeholder — store alert config
  res.json({ success: true, message: 'Alert configured.' });
});

export default router;
