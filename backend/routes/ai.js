/**
 * /api/ai — AI & Automation endpoints
 * All features are modular and independently callable.
 */
import express from 'express';
import aiService from '../services/aiService.js';
import AiConversation from '../models/AiConversation.js';
import AiUsage from '../models/AiUsage.js';
import AutomationLog from '../models/AutomationLog.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ── Helper: log AI usage ─────────────────────────────────────────────────────
async function logUsage(userId, feature, start, success = true) {
  await AiUsage.create({ userId, feature, provider: aiService.getConfig().provider, model: aiService.getConfig().model, latencyMs: Date.now() - start, success }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAT ASSISTANT (Candidate / Recruiter / Admin)
// ══════════════════════════════════════════════════════════════════════════════

router.post('/chat', async (req, res) => {
  const { message, conversationId, context } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'message is required.' });
  const start = Date.now();
  try {
    const role = req.user.role === 'recruiter' ? 'recruiter' : req.user.role === 'admin' ? 'admin' : 'candidate';
    const result = await aiService.chatAssistant({ message, context, role });

    // Save to conversation
    let conv;
    if (conversationId) {
      conv = await AiConversation.findById(conversationId);
    }
    if (!conv) {
      conv = await AiConversation.create({ userId: req.user.userId, type: role, title: message.substring(0, 50), messages: [] });
    }
    conv.messages.push({ role: 'user', content: message });
    conv.messages.push({ role: 'assistant', content: result.response });
    if (conv.messages.length > 100) conv.messages = conv.messages.slice(-100); // cap history
    await conv.save();

    await logUsage(req.user.userId, 'chat', start);
    res.json({ success: true, response: result.response, conversationId: conv._id });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CHAT HISTORY
// ══════════════════════════════════════════════════════════════════════════════

router.get('/conversations', async (req, res) => {
  try {
    const convs = await AiConversation.find({ userId: req.user.userId, isActive: true })
      .select('title type updatedAt messages').sort({ updatedAt: -1 }).limit(30).lean();
    res.json({ success: true, conversations: convs.map(c => ({ ...c, messageCount: c.messages?.length || 0, messages: undefined })) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const conv = await AiConversation.findOne({ _id: req.params.id, userId: req.user.userId }).lean();
    if (!conv) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, conversation: conv });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/conversations/:id', async (req, res) => {
  try {
    await AiConversation.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, { isActive: false });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// JOB DESCRIPTION GENERATOR & OPTIMIZER
// ══════════════════════════════════════════════════════════════════════════════

router.post('/generate-job-description', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.generateJobDescription(req.body);
    await logUsage(req.user.userId, 'generate_job_description', start);
    res.json({ success: true, description: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/optimize-job-description', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.optimizeJobDescription(req.body.description || '');
    await logUsage(req.user.userId, 'optimize_job_description', start);
    res.json({ success: true, optimized: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// INTERVIEW QUESTIONS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/interview-questions', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.generateInterviewQuestions(req.body);
    await logUsage(req.user.userId, 'interview_questions', start);
    res.json({ success: true, questions: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// RESUME SCORING
// ══════════════════════════════════════════════════════════════════════════════

router.post('/score-resume', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.scoreResume(req.body);
    await logUsage(req.user.userId, 'score_resume', start);
    res.json({ success: true, analysis: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COVER LETTER
// ══════════════════════════════════════════════════════════════════════════════

router.post('/cover-letter', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.generateCoverLetter(req.body);
    await logUsage(req.user.userId, 'cover_letter', start);
    res.json({ success: true, coverLetter: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL ASSISTANT
// ══════════════════════════════════════════════════════════════════════════════

router.post('/generate-email', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.generateEmail(req.body);
    await logUsage(req.user.userId, 'generate_email', start);
    res.json({ success: true, email: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SALARY PREDICTION
// ══════════════════════════════════════════════════════════════════════════════

router.post('/salary-prediction', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.predictSalary(req.body);
    await logUsage(req.user.userId, 'salary_prediction', start);
    res.json({ success: true, prediction: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CAREER ADVISOR
// ══════════════════════════════════════════════════════════════════════════════

router.post('/career-advice', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.getCareerAdvice(req.body);
    await logUsage(req.user.userId, 'career_advice', start);
    res.json({ success: true, advice: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SKILL GAP ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/skill-gap', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.analyzeSkillGap(req.body);
    await logUsage(req.user.userId, 'skill_gap', start);
    res.json({ success: true, analysis: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CANDIDATE RANKING
// ══════════════════════════════════════════════════════════════════════════════

router.post('/rank-candidates', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.rankCandidates(req.body);
    await logUsage(req.user.userId, 'rank_candidates', start);
    res.json({ success: true, rankings: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// JOB SUMMARY & COMPANY INSIGHTS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/summarize-job', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.summarizeJob(req.body.description || '');
    await logUsage(req.user.userId, 'summarize_job', start);
    res.json({ success: true, summary: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/company-insights/:company', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.getCompanyInsights(req.params.company);
    await logUsage(req.user.userId, 'company_insights', start);
    res.json({ success: true, insights: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// NATURAL LANGUAGE SEARCH
// ══════════════════════════════════════════════════════════════════════════════

router.post('/parse-search', async (req, res) => {
  const start = Date.now();
  try {
    const result = await aiService.parseSearchQuery(req.body.query || '');
    await logUsage(req.user.userId, 'parse_search', start);
    res.json({ success: true, filters: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// AI CONFIG & USAGE (admin)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/config', async (req, res) => {
  res.json({ success: true, config: aiService.getConfig() });
});

router.get('/usage', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usage = await AiUsage.aggregate([
      { $match: { userId: req.user.userId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$feature', count: { $sum: 1 }, avgLatency: { $avg: '$latencyMs' } } },
      { $sort: { count: -1 } },
    ]);
    const total = await AiUsage.countDocuments({ userId: req.user.userId, createdAt: { $gte: thirtyDaysAgo } });
    res.json({ success: true, usage, totalRequests: total });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTOMATION WORKFLOWS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/automation/logs', async (req, res) => {
  try {
    const logs = await AutomationLog.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, logs });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
