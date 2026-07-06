/**
 * /api/automations — TINCLO Flow: Event-driven automation platform
 * CRUD, execution, scheduling, templates, marketplace, analytics, monitoring.
 */
import express from 'express';
import Automation from '../models/automation/Automation.js';
import AutomationExecution from '../models/automation/AutomationExecution.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgMember } from '../middleware/orgPermissions.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ CRUD ══════════

router.get('/:orgId', requireOrgMember, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = { organizationId: req.params.orgId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };
    const automations = await Automation.find(filter).select('-steps -edges').sort({ updatedAt: -1 }).lean();
    res.json({ success: true, automations });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId', requireOrgMember, async (req, res) => {
  try {
    const auto = await Automation.create({ organizationId: req.params.orgId, createdBy: req.user.userId, ...req.body });
    res.status(201).json({ success: true, automation: auto });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/:id', requireOrgMember, async (req, res) => {
  try {
    const auto = await Automation.findOne({ _id: req.params.id, organizationId: req.params.orgId }).lean();
    if (!auto) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, automation: auto });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:orgId/:id', requireOrgMember, async (req, res) => {
  try {
    const auto = await Automation.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, req.body, { new: true });
    res.json({ success: true, automation: auto });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:orgId/:id', requireOrgMember, async (req, res) => {
  try { await Automation.deleteOne({ _id: req.params.id, organizationId: req.params.orgId }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/:id/activate', requireOrgMember, async (req, res) => {
  try {
    const auto = await Automation.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, { status: 'active' }, { new: true });
    res.json({ success: true, automation: auto });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/:id/pause', requireOrgMember, async (req, res) => {
  try {
    await Automation.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, { status: 'paused' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ EXECUTION ══════════

router.post('/:orgId/:id/run', requireOrgMember, async (req, res) => {
  try {
    const auto = await Automation.findOne({ _id: req.params.id, organizationId: req.params.orgId });
    if (!auto) return res.status(404).json({ success: false, message: 'Not found.' });

    const exec = await AutomationExecution.create({
      automationId: auto._id, organizationId: req.params.orgId,
      triggeredBy: req.user.userId, triggerType: req.body.triggerType || 'manual',
      triggerData: req.body.data || {}, status: 'running', startedAt: new Date(),
      variables: { ...auto.variables, ...req.body.variables },
    });

    // Update automation stats
    auto.executionCount++; auto.lastExecutedAt = new Date();
    await auto.save();

    res.json({ success: true, execution: exec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/executions/list', requireOrgMember, async (req, res) => {
  try {
    const { status, automationId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { organizationId: req.params.orgId };
    if (status) filter.status = status;
    if (automationId) filter.automationId = automationId;
    const [executions, total] = await Promise.all([
      AutomationExecution.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
      AutomationExecution.countDocuments(filter),
    ]);
    res.json(paginatedResponse(executions, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/executions/:execId', requireOrgMember, async (req, res) => {
  try {
    const exec = await AutomationExecution.findOne({ _id: req.params.execId, organizationId: req.params.orgId }).lean();
    if (!exec) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, execution: exec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/executions/:execId/cancel', requireOrgMember, async (req, res) => {
  try {
    await AutomationExecution.findByIdAndUpdate(req.params.execId, { status: 'cancelled', completedAt: new Date() });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/executions/:execId/retry', requireOrgMember, async (req, res) => {
  try {
    const exec = await AutomationExecution.findByIdAndUpdate(req.params.execId, { status: 'running', $inc: { retryCount: 1 }, error: '' }, { new: true });
    res.json({ success: true, execution: exec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ TEMPLATES ══════════

router.get('/templates/all', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isTemplate: true, status: 'active' };
    if (category) filter.category = category;
    const templates = await Automation.find(filter).select('-steps -edges').sort({ executionCount: -1 }).lean();
    res.json({ success: true, templates });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/from-template/:templateId', requireOrgMember, async (req, res) => {
  try {
    const tpl = await Automation.findById(req.params.templateId).lean();
    if (!tpl) return res.status(404).json({ success: false, message: 'Template not found.' });
    const { _id, organizationId, createdBy, isTemplate, status, executionCount, ...rest } = tpl;
    const auto = await Automation.create({ ...rest, organizationId: req.params.orgId, createdBy: req.user.userId, isTemplate: false, status: 'draft', name: req.body.name || tpl.name, executionCount: 0 });
    res.status(201).json({ success: true, automation: auto });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ANALYTICS ══════════

router.get('/:orgId/analytics/summary', requireOrgMember, async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const [total, active, totalExec, running, completed, failed] = await Promise.all([
      Automation.countDocuments({ organizationId: orgId }),
      Automation.countDocuments({ organizationId: orgId, status: 'active' }),
      AutomationExecution.countDocuments({ organizationId: orgId }),
      AutomationExecution.countDocuments({ organizationId: orgId, status: 'running' }),
      AutomationExecution.countDocuments({ organizationId: orgId, status: 'completed' }),
      AutomationExecution.countDocuments({ organizationId: orgId, status: 'failed' }),
    ]);
    res.json({ success: true, analytics: { totalAutomations: total, activeAutomations: active, totalExecutions: totalExec, running, completed, failed, successRate: totalExec > 0 ? Math.round((completed / totalExec) * 100) : 0 } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ MONITORING ══════════

router.get('/:orgId/monitoring', requireOrgMember, async (req, res) => {
  try {
    const running = await AutomationExecution.find({ organizationId: req.params.orgId, status: 'running' }).select('automationId triggeredBy startedAt currentStepId').lean();
    const queued = await AutomationExecution.countDocuments({ organizationId: req.params.orgId, status: 'queued' });
    const recentFailed = await AutomationExecution.find({ organizationId: req.params.orgId, status: 'failed' }).sort({ completedAt: -1 }).limit(5).select('automationId error completedAt').lean();
    res.json({ success: true, monitoring: { running, queueSize: queued, recentFailures: recentFailed } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
