/**
 * /api/ai-studio — Enterprise AI Studio (no-code AI builder)
 * Assistants, knowledge bases, prompts, workflows, testing, deployment, analytics.
 */
import express from 'express';
import AiAssistant from '../models/aiStudio/AiAssistant.js';
import KnowledgeBase from '../models/aiStudio/KnowledgeBase.js';
import AiStudioWorkflow from '../models/aiStudio/AiStudioWorkflow.js';
import aiService from '../services/aiService.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgMember } from '../middleware/orgPermissions.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ AI ASSISTANTS ══════════

router.get('/:orgId/assistants', requireOrgMember, async (req, res) => {
  try {
    const assistants = await AiAssistant.find({ organizationId: req.params.orgId }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, assistants });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/assistants', requireOrgMember, async (req, res) => {
  try {
    const assistant = await AiAssistant.create({ organizationId: req.params.orgId, createdBy: req.user.userId, ...req.body });
    res.status(201).json({ success: true, assistant });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/assistants/:id', requireOrgMember, async (req, res) => {
  try {
    const a = await AiAssistant.findOne({ _id: req.params.id, organizationId: req.params.orgId }).lean();
    if (!a) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, assistant: a });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:orgId/assistants/:id', requireOrgMember, async (req, res) => {
  try {
    const a = await AiAssistant.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, req.body, { new: true });
    res.json({ success: true, assistant: a });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:orgId/assistants/:id', requireOrgMember, async (req, res) => {
  try { await AiAssistant.deleteOne({ _id: req.params.id, organizationId: req.params.orgId }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/assistants/:id/deploy', requireOrgMember, async (req, res) => {
  try {
    const a = await AiAssistant.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, { status: 'active' }, { new: true });
    res.json({ success: true, assistant: a });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Chat with a custom assistant
router.post('/:orgId/assistants/:id/chat', requireOrgMember, async (req, res) => {
  const { message, context } = req.body;
  try {
    const assistant = await AiAssistant.findOne({ _id: req.params.id, organizationId: req.params.orgId }).lean();
    if (!assistant) return res.status(404).json({ success: false, message: 'Assistant not found.' });

    const systemPrompt = `${assistant.systemPrompt}\n\nInstructions: ${assistant.instructions}\nRules: ${(assistant.rules || []).join('. ')}\nTone: ${assistant.tone}`;
    const result = await aiService.chatAssistant({ message, context: context || '', role: 'candidate' });
    
    await AiAssistant.findByIdAndUpdate(assistant._id, { $inc: { conversationCount: 1 } });
    res.json({ success: true, response: result.response, assistant: assistant.name });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ KNOWLEDGE BASES ══════════

router.get('/:orgId/knowledge', requireOrgMember, async (req, res) => {
  try {
    const kbs = await KnowledgeBase.find({ organizationId: req.params.orgId }).select('-documents.content').lean();
    res.json({ success: true, knowledgeBases: kbs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/knowledge', requireOrgMember, async (req, res) => {
  try {
    const kb = await KnowledgeBase.create({ organizationId: req.params.orgId, createdBy: req.user.userId, ...req.body });
    res.status(201).json({ success: true, knowledgeBase: kb });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/knowledge/:kbId/documents', requireOrgMember, async (req, res) => {
  const { title, content, url, fileType } = req.body;
  try {
    const kb = await KnowledgeBase.findOne({ _id: req.params.kbId, organizationId: req.params.orgId });
    if (!kb) return res.status(404).json({ success: false, message: 'Knowledge base not found.' });
    
    const wordCount = (content || '').split(/\s+/).length;
    const chunks = Math.ceil(wordCount / 500);
    kb.documents.push({ title, content, url, fileType, wordCount, chunks, status: 'indexed' });
    kb.documentCount = kb.documents.length;
    kb.totalWords += wordCount;
    kb.totalChunks += chunks;
    await kb.save();

    res.json({ success: true, document: kb.documents[kb.documents.length - 1] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:orgId/knowledge/:kbId', requireOrgMember, async (req, res) => {
  try { await KnowledgeBase.deleteOne({ _id: req.params.kbId, organizationId: req.params.orgId }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ AI WORKFLOWS ══════════

router.get('/:orgId/workflows', requireOrgMember, async (req, res) => {
  try {
    const workflows = await AiStudioWorkflow.find({ organizationId: req.params.orgId }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, workflows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/workflows', requireOrgMember, async (req, res) => {
  try {
    const wf = await AiStudioWorkflow.create({ organizationId: req.params.orgId, createdBy: req.user.userId, ...req.body });
    res.status(201).json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:orgId/workflows/:id', requireOrgMember, async (req, res) => {
  try {
    const wf = await AiStudioWorkflow.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, req.body, { new: true });
    res.json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:orgId/workflows/:id', requireOrgMember, async (req, res) => {
  try { await AiStudioWorkflow.deleteOne({ _id: req.params.id, organizationId: req.params.orgId }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ TESTING ══════════

router.post('/:orgId/test-prompt', requireOrgMember, async (req, res) => {
  const { systemPrompt, userMessage, model, temperature } = req.body;
  try {
    const result = await aiService.chatAssistant({ message: userMessage || 'Hello', context: systemPrompt || '', role: 'candidate' });
    res.json({ success: true, response: result.response, model: model || aiService.getConfig().model });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ANALYTICS ══════════

router.get('/:orgId/analytics', requireOrgMember, async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const [assistants, kbs, workflows] = await Promise.all([
      AiAssistant.find({ organizationId: orgId }).lean(),
      KnowledgeBase.find({ organizationId: orgId }).lean(),
      AiStudioWorkflow.find({ organizationId: orgId }).lean(),
    ]);
    const totalConversations = assistants.reduce((s, a) => s + (a.conversationCount || 0), 0);
    const totalDocuments = kbs.reduce((s, k) => s + (k.documentCount || 0), 0);
    res.json({ success: true, analytics: {
      assistants: assistants.length, activeAssistants: assistants.filter(a => a.status === 'active').length,
      knowledgeBases: kbs.length, totalDocuments,
      workflows: workflows.length, totalConversations,
    }});
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
