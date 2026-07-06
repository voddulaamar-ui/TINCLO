/**
 * /api/copilot — AI Recruiting Copilot
 * Resume builder, optimizer, career planner, interview coach, candidate ranking,
 * comparison, talent search, automation, knowledge base.
 */
import express from 'express';
import aiService from '../services/aiService.js';
import CareerPlan from '../models/copilot/CareerPlan.js';
import CandidateRanking from '../models/copilot/CandidateRanking.js';
import PromptTemplate from '../models/copilot/PromptTemplate.js';
import AiConversation from '../models/AiConversation.js';
import AiUsage from '../models/AiUsage.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

async function log(userId, feature, start) {
  await AiUsage.create({ userId, feature, provider: aiService.getConfig().provider, latencyMs: Date.now() - start }).catch(() => {});
}

// ══════════ RESUME BUILDER ══════════
router.post('/resume/build', async (req, res) => {
  const s = Date.now();
  try {
    const { profile, template } = req.body;
    const prompt = `Generate a professional ${template || 'modern'} resume in markdown format for:\n${JSON.stringify(profile || {})}`;
    const result = await aiService.chatAssistant({ message: prompt, role: 'candidate', context: 'resume_builder' });
    await log(req.user.userId, 'resume_build', s);
    res.json({ success: true, resume: result.response });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ RESUME OPTIMIZER ══════════
router.post('/resume/optimize', async (req, res) => {
  const s = Date.now();
  try {
    const result = await aiService.scoreResume(req.body);
    await log(req.user.userId, 'resume_optimize', s);
    res.json({ success: true, analysis: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ RESUME TAILORING ══════════
router.post('/resume/tailor', async (req, res) => {
  const s = Date.now();
  try {
    const { resumeText, jobDescription } = req.body;
    const prompt = `Tailor this resume for the job. Highlight matching skills, suggest additions.\n\nResume:\n${(resumeText || '').substring(0, 2000)}\n\nJob:\n${(jobDescription || '').substring(0, 1500)}`;
    const result = await aiService.chatAssistant({ message: prompt, role: 'candidate' });
    await log(req.user.userId, 'resume_tailor', s);
    res.json({ success: true, tailored: result.response });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ CAREER PLANNER ══════════
router.post('/career-plan', async (req, res) => {
  const s = Date.now();
  try {
    const advice = await aiService.getCareerAdvice(req.body);
    const plan = await CareerPlan.create({ userId: req.user.userId, ...req.body, roadmap: advice });
    await log(req.user.userId, 'career_plan', s);
    res.json({ success: true, plan: { ...plan.toObject(), roadmap: advice } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/career-plan', async (req, res) => {
  try {
    const plans = await CareerPlan.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(5).lean();
    res.json({ success: true, plans });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SKILL ROADMAP ══════════
router.post('/skill-roadmap', async (req, res) => {
  const s = Date.now();
  try {
    const result = await aiService.analyzeSkillGap(req.body);
    await log(req.user.userId, 'skill_roadmap', s);
    res.json({ success: true, roadmap: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ INTERVIEW COACH ══════════
router.post('/interview/practice', async (req, res) => {
  const s = Date.now();
  try {
    const { role, skills, type, difficulty } = req.body;
    const questions = await aiService.generateInterviewQuestions({ role, skills, difficulty, count: 5 });
    await log(req.user.userId, 'interview_coach', s);
    res.json({ success: true, questions });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/interview/evaluate', async (req, res) => {
  const s = Date.now();
  try {
    const { question, answer } = req.body;
    const prompt = `Evaluate this interview answer:\nQ: ${question}\nA: ${answer}\n\nRate communication, technical accuracy, confidence. Provide improvement suggestions.`;
    const result = await aiService.chatAssistant({ message: prompt, role: 'candidate' });
    await log(req.user.userId, 'interview_evaluate', s);
    res.json({ success: true, evaluation: result.response });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SALARY ADVISOR ══════════
router.post('/salary-advice', async (req, res) => {
  const s = Date.now();
  try {
    const result = await aiService.predictSalary(req.body);
    await log(req.user.userId, 'salary_advice', s);
    res.json({ success: true, prediction: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ COVER LETTER ══════════
router.post('/cover-letter', async (req, res) => {
  const s = Date.now();
  try {
    const result = await aiService.generateCoverLetter(req.body);
    await log(req.user.userId, 'cover_letter', s);
    res.json({ success: true, coverLetter: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PORTFOLIO REVIEW ══════════
router.post('/portfolio/review', async (req, res) => {
  const s = Date.now();
  try {
    const { projects, github, portfolio } = req.body;
    const prompt = `Review this developer portfolio and suggest improvements:\nProjects: ${JSON.stringify(projects || [])}\nGitHub: ${github || 'N/A'}\nPortfolio: ${portfolio || 'N/A'}\n\nProvide: strengths, weaknesses, missing technologies, presentation tips.`;
    const result = await aiService.chatAssistant({ message: prompt, role: 'candidate' });
    await log(req.user.userId, 'portfolio_review', s);
    res.json({ success: true, review: result.response });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ CANDIDATE RANKING (Recruiter) ══════════
router.post('/rank-candidates', async (req, res) => {
  const s = Date.now();
  try {
    const { jobId, candidates, criteria } = req.body;
    const rankings = await aiService.rankCandidates({ candidates, jobRequirements: criteria });
    const saved = await CandidateRanking.create({ jobId, generatedBy: req.user.userId, rankings: Array.isArray(rankings) ? rankings : [], criteria, organizationId: req.body.organizationId });
    await log(req.user.userId, 'rank_candidates', s);
    res.json({ success: true, ranking: saved });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/rankings/:jobId', async (req, res) => {
  try {
    const rankings = await CandidateRanking.find({ jobId: req.params.jobId }).sort({ generatedAt: -1 }).limit(5).lean();
    res.json({ success: true, rankings });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ CANDIDATE COMPARISON ══════════
router.post('/compare-candidates', async (req, res) => {
  const s = Date.now();
  try {
    const { candidates } = req.body;
    const prompt = `Compare these candidates side-by-side:\n${JSON.stringify(candidates?.slice(0, 5))}\n\nProvide comparison table with skills, experience, strengths, weaknesses, recommendation.`;
    const result = await aiService.chatAssistant({ message: prompt, role: 'recruiter' });
    await log(req.user.userId, 'compare_candidates', s);
    res.json({ success: true, comparison: result.response });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ JOB DESCRIPTION ══════════
router.post('/job-description/generate', async (req, res) => {
  const s = Date.now();
  try {
    const result = await aiService.generateJobDescription(req.body);
    await log(req.user.userId, 'jd_generate', s);
    res.json({ success: true, description: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/job-description/optimize', async (req, res) => {
  const s = Date.now();
  try {
    const result = await aiService.optimizeJobDescription(req.body.description);
    await log(req.user.userId, 'jd_optimize', s);
    res.json({ success: true, optimized: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ INTERVIEW SUMMARY ══════════
router.post('/interview/summarize', async (req, res) => {
  const s = Date.now();
  try {
    const { notes, candidateName, jobTitle } = req.body;
    const prompt = `Summarize this interview for ${candidateName} (${jobTitle}):\n${notes}\n\nProvide: strengths, weaknesses, technical assessment, recommendation (hire/maybe/reject), confidence level.`;
    const result = await aiService.chatAssistant({ message: prompt, role: 'recruiter' });
    await log(req.user.userId, 'interview_summary', s);
    res.json({ success: true, summary: result.response });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ EMAIL ASSISTANT ══════════
router.post('/email/generate', async (req, res) => {
  const s = Date.now();
  try {
    const result = await aiService.generateEmail(req.body);
    await log(req.user.userId, 'email_generate', s);
    res.json({ success: true, email: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ TALENT SEARCH (NL → filters) ══════════
router.post('/search', async (req, res) => {
  const s = Date.now();
  try {
    const result = await aiService.parseSearchQuery(req.body.query);
    await log(req.user.userId, 'talent_search', s);
    res.json({ success: true, filters: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PROMPT TEMPLATES (Admin) ══════════
router.get('/prompts', async (req, res) => {
  try {
    const prompts = await PromptTemplate.find({ isActive: true }).lean();
    res.json({ success: true, prompts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/prompts', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const prompt = await PromptTemplate.findOneAndUpdate({ key: req.body.key }, req.body, { upsert: true, new: true });
    res.json({ success: true, prompt });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ COPILOT CHAT (contextual) ══════════
router.post('/chat', async (req, res) => {
  const s = Date.now();
  try {
    const { message, context, conversationId } = req.body;
    const role = req.user.role === 'recruiter' ? 'recruiter' : req.user.role === 'admin' ? 'admin' : 'candidate';
    const result = await aiService.chatAssistant({ message, context, role });

    let conv;
    if (conversationId) conv = await AiConversation.findById(conversationId);
    if (!conv) conv = await AiConversation.create({ userId: req.user.userId, type: role, title: message.substring(0, 50) });
    conv.messages.push({ role: 'user', content: message }, { role: 'assistant', content: result.response });
    if (conv.messages.length > 100) conv.messages = conv.messages.slice(-100);
    await conv.save();

    await log(req.user.userId, 'copilot_chat', s);
    res.json({ success: true, response: result.response, conversationId: conv._id });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
