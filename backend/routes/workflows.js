/**
 * /api/workflows — Low-Code Workflow Builder & Execution Engine
 * CRUD, execution, approvals, templates, analytics, simulation.
 */
import express from 'express';
import Workflow from '../models/workflow/Workflow.js';
import WorkflowExecution from '../models/workflow/WorkflowExecution.js';
import ApprovalRequest from '../models/workflow/ApprovalRequest.js';
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
    const workflows = await Workflow.find(filter).select('-nodes -edges').sort({ updatedAt: -1 }).lean();
    res.json({ success: true, workflows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId', requireOrgMember, async (req, res) => {
  try {
    const wf = await Workflow.create({ organizationId: req.params.orgId, createdBy: req.user.userId, ...req.body });
    res.status(201).json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/:id', requireOrgMember, async (req, res) => {
  try {
    const wf = await Workflow.findOne({ _id: req.params.id, organizationId: req.params.orgId }).lean();
    if (!wf) return res.status(404).json({ success: false, message: 'Workflow not found.' });
    res.json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:orgId/:id', requireOrgMember, async (req, res) => {
  try {
    const wf = await Workflow.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, req.body, { new: true });
    res.json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:orgId/:id', requireOrgMember, async (req, res) => {
  try {
    await Workflow.deleteOne({ _id: req.params.id, organizationId: req.params.orgId });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/:id/publish', requireOrgMember, async (req, res) => {
  try {
    const wf = await Workflow.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, { status: 'published' }, { new: true });
    res.json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ EXECUTION ══════════

router.post('/:orgId/:id/execute', requireOrgMember, async (req, res) => {
  try {
    const wf = await Workflow.findOne({ _id: req.params.id, organizationId: req.params.orgId, status: 'published' });
    if (!wf) return res.status(404).json({ success: false, message: 'Published workflow not found.' });
    
    const execution = await WorkflowExecution.create({
      workflowId: wf._id, organizationId: req.params.orgId,
      triggeredBy: req.user.userId, triggerEvent: req.body.event || 'manual',
      triggerData: req.body.data || {}, status: 'running',
      variables: { ...wf.variables, ...req.body.variables },
    });

    // Simplified execution: mark first node as running
    if (wf.nodes.length > 0) {
      execution.currentNodeId = wf.nodes[0].id;
      execution.steps.push({ nodeId: wf.nodes[0].id, nodeType: wf.nodes[0].type, label: wf.nodes[0].label, status: 'running', startedAt: new Date() });
      await execution.save();
    }

    res.json({ success: true, execution });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/executions/list', requireOrgMember, async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { organizationId: req.params.orgId };
    if (status) filter.status = status;
    const [executions, total] = await Promise.all([
      WorkflowExecution.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
      WorkflowExecution.countDocuments(filter),
    ]);
    res.json(paginatedResponse(executions, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/executions/:execId', requireOrgMember, async (req, res) => {
  try {
    const exec = await WorkflowExecution.findOne({ _id: req.params.execId, organizationId: req.params.orgId }).lean();
    if (!exec) return res.status(404).json({ success: false, message: 'Execution not found.' });
    res.json({ success: true, execution: exec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/executions/:execId/cancel', requireOrgMember, async (req, res) => {
  try {
    await WorkflowExecution.findByIdAndUpdate(req.params.execId, { status: 'cancelled', completedAt: new Date() });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ APPROVALS ══════════

router.get('/:orgId/approvals', requireOrgMember, async (req, res) => {
  try {
    const approvals = await ApprovalRequest.find({
      organizationId: req.params.orgId,
      $or: [{ approvers: req.user.userId }, { requestedBy: req.user.userId }],
    }).sort({ createdAt: -1 }).limit(30).lean();
    res.json({ success: true, approvals });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/approvals/:id/respond', requireOrgMember, async (req, res) => {
  const { decision, comment } = req.body;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ success: false, message: 'Invalid decision.' });
  try {
    const approval = await ApprovalRequest.findById(req.params.id);
    if (!approval) return res.status(404).json({ success: false, message: 'Approval not found.' });
    approval.responses.push({ userId: req.user.userId, decision, comment: comment || '' });

    // Check if resolved
    if (approval.approvalType === 'any_one') {
      approval.status = decision;
    } else if (approval.approvalType === 'sequential' || approval.approvalType === 'parallel') {
      const all = approval.responses.length >= approval.approvers.length;
      if (all) {
        const rejected = approval.responses.some(r => r.decision === 'rejected');
        approval.status = rejected ? 'rejected' : 'approved';
      }
    } else if (approval.approvalType === 'majority') {
      const approved = approval.responses.filter(r => r.decision === 'approved').length;
      if (approved > approval.approvers.length / 2) approval.status = 'approved';
      else if (approval.responses.length >= approval.approvers.length) approval.status = 'rejected';
    }

    if (approval.status !== 'pending') approval.resolvedAt = new Date();
    await approval.save();

    // Resume execution if approved
    if (approval.status === 'approved') {
      await WorkflowExecution.findByIdAndUpdate(approval.executionId, { status: 'running' });
    } else if (approval.status === 'rejected') {
      await WorkflowExecution.findByIdAndUpdate(approval.executionId, { status: 'failed', error: 'Approval rejected' });
    }

    res.json({ success: true, approval });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ TEMPLATES ══════════

router.get('/templates/list', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isTemplate: true, status: 'published' };
    if (category) filter.category = category;
    const templates = await Workflow.find(filter).select('-nodes -edges').sort({ name: 1 }).lean();
    res.json({ success: true, templates });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/from-template/:templateId', requireOrgMember, async (req, res) => {
  try {
    const template = await Workflow.findById(req.params.templateId).lean();
    if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });
    const { _id, organizationId, createdBy, isTemplate, status, ...rest } = template;
    const wf = await Workflow.create({ ...rest, organizationId: req.params.orgId, createdBy: req.user.userId, isTemplate: false, status: 'draft', name: req.body.name || template.name });
    res.status(201).json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SIMULATE (dry run) ══════════

router.post('/:orgId/:id/simulate', requireOrgMember, async (req, res) => {
  try {
    const wf = await Workflow.findOne({ _id: req.params.id, organizationId: req.params.orgId }).lean();
    if (!wf) return res.status(404).json({ success: false, message: 'Workflow not found.' });
    // Validate workflow structure
    const errors = [];
    if (!wf.nodes.length) errors.push('Workflow has no nodes.');
    const triggers = wf.nodes.filter(n => n.type === 'trigger');
    if (!triggers.length) errors.push('No trigger node found.');
    const ends = wf.nodes.filter(n => n.type === 'end');
    if (!ends.length) errors.push('No end node found.');
    // Check all nodes have connections
    const nodeIds = new Set(wf.nodes.map(n => n.id));
    for (const edge of (wf.edges || [])) {
      if (!nodeIds.has(edge.source)) errors.push(`Edge references missing source: ${edge.source}`);
      if (!nodeIds.has(edge.target)) errors.push(`Edge references missing target: ${edge.target}`);
    }
    const valid = errors.length === 0;
    res.json({ success: true, valid, errors, nodeCount: wf.nodes.length, edgeCount: (wf.edges || []).length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ANALYTICS ══════════

router.get('/:orgId/analytics/summary', requireOrgMember, async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const [total, running, completed, failed] = await Promise.all([
      WorkflowExecution.countDocuments({ organizationId: orgId }),
      WorkflowExecution.countDocuments({ organizationId: orgId, status: 'running' }),
      WorkflowExecution.countDocuments({ organizationId: orgId, status: 'completed' }),
      WorkflowExecution.countDocuments({ organizationId: orgId, status: 'failed' }),
    ]);
    const pendingApprovals = await ApprovalRequest.countDocuments({ organizationId: orgId, status: 'pending' });
    res.json({ success: true, analytics: { totalExecutions: total, running, completed, failed, pendingApprovals, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
