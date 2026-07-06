/**
 * /api/bpm — Enterprise BPM Workflow Designer & Orchestration
 */
import express from 'express';
import BpmWorkflow from '../models/bpm/BpmWorkflow.js';
import BpmExecution from '../models/bpm/BpmExecution.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgMember } from '../middleware/orgPermissions.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ WORKFLOW CRUD ══════════

router.get('/:orgId', requireOrgMember, async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = { organizationId: req.params.orgId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    const workflows = await BpmWorkflow.find(filter).select('-stages -edges -forms').sort({ updatedAt: -1 }).lean();
    res.json({ success: true, workflows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId', requireOrgMember, async (req, res) => {
  try {
    const wf = await BpmWorkflow.create({ organizationId: req.params.orgId, createdBy: req.user.userId, ...req.body });
    res.status(201).json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/:id', requireOrgMember, async (req, res) => {
  try {
    const wf = await BpmWorkflow.findOne({ _id: req.params.id, organizationId: req.params.orgId }).lean();
    if (!wf) return res.status(404).json({ success: false, message: 'Workflow not found.' });
    res.json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:orgId/:id', requireOrgMember, async (req, res) => {
  try {
    const wf = await BpmWorkflow.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, req.body, { new: true });
    res.json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:orgId/:id', requireOrgMember, async (req, res) => {
  try { await BpmWorkflow.deleteOne({ _id: req.params.id, organizationId: req.params.orgId }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/:id/publish', requireOrgMember, async (req, res) => {
  try {
    const wf = await BpmWorkflow.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, { status: 'published', publishedBy: req.user.userId, publishedAt: new Date() }, { new: true });
    res.json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ EXECUTION ══════════

router.post('/:orgId/:id/execute', requireOrgMember, async (req, res) => {
  try {
    const wf = await BpmWorkflow.findOne({ _id: req.params.id, organizationId: req.params.orgId, status: 'published' });
    if (!wf) return res.status(404).json({ success: false, message: 'Published workflow not found.' });
    const exec = await BpmExecution.create({
      workflowId: wf._id, organizationId: req.params.orgId,
      triggeredBy: req.user.userId, triggerData: req.body.data || {},
      status: 'running', variables: { ...wf.variables, ...req.body.variables },
      currentStageId: wf.stages[0]?.id || null,
    });
    wf.executionCount++;
    await wf.save();
    res.json({ success: true, execution: exec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/executions/list', requireOrgMember, async (req, res) => {
  try {
    const { status, workflowId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { organizationId: req.params.orgId };
    if (status) filter.status = status;
    if (workflowId) filter.workflowId = workflowId;
    const [execs, total] = await Promise.all([
      BpmExecution.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
      BpmExecution.countDocuments(filter),
    ]);
    res.json(paginatedResponse(execs, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/executions/:execId', requireOrgMember, async (req, res) => {
  try {
    const exec = await BpmExecution.findOne({ _id: req.params.execId, organizationId: req.params.orgId }).lean();
    if (!exec) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, execution: exec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/executions/:execId/advance', requireOrgMember, async (req, res) => {
  const { nextStageId, output } = req.body;
  try {
    const exec = await BpmExecution.findById(req.params.execId);
    if (!exec) return res.status(404).json({ success: false, message: 'Not found.' });
    // Complete current task
    const current = exec.tasks.find(t => t.stageId === exec.currentStageId && t.status === 'running');
    if (current) { current.status = 'completed'; current.completedAt = new Date(); current.output = output; current.duration = Date.now() - (current.startedAt || Date.now()); }
    // Move to next
    if (nextStageId) {
      exec.currentStageId = nextStageId;
      exec.tasks.push({ stageId: nextStageId, status: 'running', startedAt: new Date() });
    } else {
      exec.status = 'completed'; exec.completedAt = new Date(); exec.duration = Date.now() - exec.startedAt;
    }
    await exec.save();
    res.json({ success: true, execution: exec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ TEMPLATES ══════════

router.get('/templates/all', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isTemplate: true, status: 'published' };
    if (category) filter.category = category;
    const templates = await BpmWorkflow.find(filter).select('-stages -edges').sort({ executionCount: -1 }).lean();
    res.json({ success: true, templates });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/from-template/:templateId', requireOrgMember, async (req, res) => {
  try {
    const tpl = await BpmWorkflow.findById(req.params.templateId).lean();
    if (!tpl) return res.status(404).json({ success: false, message: 'Template not found.' });
    const { _id, organizationId, createdBy, isTemplate, status, executionCount, ...rest } = tpl;
    const wf = await BpmWorkflow.create({ ...rest, organizationId: req.params.orgId, createdBy: req.user.userId, isTemplate: false, status: 'draft', name: req.body.name || tpl.name, executionCount: 0 });
    res.status(201).json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ANALYTICS & PROCESS MINING ══════════

router.get('/:orgId/analytics/summary', requireOrgMember, async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const [total, published, running, completed, failed, slaBreaches] = await Promise.all([
      BpmWorkflow.countDocuments({ organizationId: orgId }),
      BpmWorkflow.countDocuments({ organizationId: orgId, status: 'published' }),
      BpmExecution.countDocuments({ organizationId: orgId, status: 'running' }),
      BpmExecution.countDocuments({ organizationId: orgId, status: 'completed' }),
      BpmExecution.countDocuments({ organizationId: orgId, status: 'failed' }),
      BpmExecution.countDocuments({ organizationId: orgId, slaBreaches: { $gt: 0 } }),
    ]);
    const avgDuration = await BpmExecution.aggregate([
      { $match: { organizationId: orgId, status: 'completed' } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]);
    res.json({ success: true, analytics: { totalWorkflows: total, published, running, completed, failed, slaBreaches, avgDurationMs: avgDuration[0]?.avg || 0, successRate: (running + completed + failed) > 0 ? Math.round((completed / (completed + failed)) * 100) : 0 } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SIMULATE ══════════

router.post('/:orgId/:id/simulate', requireOrgMember, async (req, res) => {
  try {
    const wf = await BpmWorkflow.findOne({ _id: req.params.id, organizationId: req.params.orgId }).lean();
    if (!wf) return res.status(404).json({ success: false, message: 'Not found.' });
    const errors = [];
    if (!wf.stages.length) errors.push('No stages defined.');
    const starts = wf.stages.filter(s => s.type === 'start');
    const ends = wf.stages.filter(s => s.type === 'end');
    if (!starts.length) errors.push('No start node.');
    if (!ends.length) errors.push('No end node.');
    res.json({ success: true, valid: errors.length === 0, errors, stageCount: wf.stages.length, edgeCount: (wf.edges || []).length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
