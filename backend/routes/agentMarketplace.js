/**
 * /api/agents — AI Agent Marketplace & Execution
 */
import express from 'express';
import AgentListing from '../models/agents/AgentListing.js';
import InstalledAgent from '../models/agents/InstalledAgent.js';
import AgentExecution from '../models/agents/AgentExecution.js';
import aiService from '../services/aiService.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgMember } from '../middleware/orgPermissions.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const router = express.Router();

// ══════════ MARKETPLACE (public) ══════════

router.get('/marketplace', async (req, res) => {
  try {
    const { category, search, license, sort } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (license) filter.license = license;
    if (search) filter.$text = { $search: search };
    const sortOpt = sort === 'rating' ? { rating: -1 } : sort === 'newest' ? { createdAt: -1 } : { downloads: -1 };
    const [agents, total] = await Promise.all([
      AgentListing.find(filter).sort(sortOpt).skip(skip).limit(limit).lean(),
      AgentListing.countDocuments(filter),
    ]);
    res.json(paginatedResponse(agents, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/marketplace/:key', async (req, res) => {
  try {
    const agent = await AgentListing.findOne({ key: req.params.key }).lean();
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found.' });
    res.json({ success: true, agent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ INSTALLATION (auth required) ══════════

router.use(authenticateToken);

router.get('/:orgId/installed', requireOrgMember, async (req, res) => {
  try {
    const installed = await InstalledAgent.find({ organizationId: req.params.orgId }).populate('agentId').lean();
    res.json({ success: true, installed });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/install', requireOrgMember, async (req, res) => {
  const { agentKey } = req.body;
  try {
    const agent = await AgentListing.findOne({ key: agentKey, status: 'published' });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found.' });
    const installed = await InstalledAgent.findOneAndUpdate(
      { organizationId: req.params.orgId, agentKey },
      { organizationId: req.params.orgId, agentKey, agentId: agent._id, version: agent.version, isEnabled: true, installedBy: req.user.userId, permissions: agent.requiredPermissions, config: { systemPrompt: agent.systemPrompt, model: agent.defaultModel } },
      { upsert: true, new: true }
    );
    await AgentListing.findByIdAndUpdate(agent._id, { $inc: { downloads: 1, activeInstalls: 1 } });
    res.json({ success: true, installed });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:orgId/uninstall/:agentKey', requireOrgMember, async (req, res) => {
  try {
    const result = await InstalledAgent.findOneAndDelete({ organizationId: req.params.orgId, agentKey: req.params.agentKey });
    if (result) await AgentListing.findByIdAndUpdate(result.agentId, { $inc: { activeInstalls: -1 } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:orgId/config/:agentKey', requireOrgMember, async (req, res) => {
  try {
    const installed = await InstalledAgent.findOneAndUpdate(
      { organizationId: req.params.orgId, agentKey: req.params.agentKey },
      { config: req.body.config || {}, permissions: req.body.permissions },
      { new: true }
    );
    res.json({ success: true, installed });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/toggle/:agentKey', requireOrgMember, async (req, res) => {
  try {
    const ia = await InstalledAgent.findOne({ organizationId: req.params.orgId, agentKey: req.params.agentKey });
    if (!ia) return res.status(404).json({ success: false, message: 'Not installed.' });
    ia.isEnabled = !ia.isEnabled;
    await ia.save();
    res.json({ success: true, isEnabled: ia.isEnabled });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ EXECUTION ══════════

router.post('/:orgId/execute/:agentKey', requireOrgMember, async (req, res) => {
  const start = Date.now();
  try {
    const installed = await InstalledAgent.findOne({ organizationId: req.params.orgId, agentKey: req.params.agentKey, isEnabled: true });
    if (!installed) return res.status(404).json({ success: false, message: 'Agent not installed or disabled.' });

    // Execute via AI service
    const systemPrompt = installed.config.systemPrompt || '';
    const message = typeof req.body.input === 'string' ? req.body.input : JSON.stringify(req.body.input);
    const result = await aiService.chatAssistant({ message, context: systemPrompt, role: 'recruiter' });

    const execution = await AgentExecution.create({
      organizationId: req.params.orgId, agentKey: req.params.agentKey,
      triggeredBy: req.user.userId, input: req.body.input,
      output: result.response, status: 'completed',
      duration: Date.now() - start, model: installed.config.model || aiService.getConfig().model,
    });

    installed.executionCount++; installed.successCount++; installed.lastExecutedAt = new Date();
    await installed.save();

    res.json({ success: true, execution, output: result.response });
  } catch (e) {
    await AgentExecution.create({ organizationId: req.params.orgId, agentKey: req.params.agentKey, triggeredBy: req.user.userId, input: req.body.input, status: 'failed', error: e.message, duration: Date.now() - start });
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:orgId/executions/:agentKey', requireOrgMember, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { organizationId: req.params.orgId, agentKey: req.params.agentKey };
    const [executions, total] = await Promise.all([
      AgentExecution.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AgentExecution.countDocuments(filter),
    ]);
    res.json(paginatedResponse(executions, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ANALYTICS ══════════

router.get('/:orgId/analytics', requireOrgMember, async (req, res) => {
  try {
    const installed = await InstalledAgent.find({ organizationId: req.params.orgId }).lean();
    const totalExec = installed.reduce((s, a) => s + a.executionCount, 0);
    const totalSuccess = installed.reduce((s, a) => s + a.successCount, 0);
    res.json({ success: true, analytics: { installedAgents: installed.length, totalExecutions: totalExec, successRate: totalExec > 0 ? Math.round((totalSuccess / totalExec) * 100) : 0 } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
