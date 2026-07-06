/**
 * /api/skills — Intelligent Skill Graph
 * Graph visualization, relationships, recommendations, career paths, demand, gap analysis.
 */
import express from 'express';
import SkillNode from '../models/skillGraph/SkillNode.js';
import UserSkillGraph from '../models/skillGraph/UserSkillGraph.js';
import Job from '../models/Job.js';
import { authenticateToken } from '../middleware/auth.js';
import aiService from '../services/aiService.js';
import cache from '../utils/cache.js';

const router = express.Router();

// ══════════ SKILL CATALOG (public) ══════════

router.get('/catalog', async (req, res) => {
  try {
    const { category, search, emerging } = req.query;
    const ck = `skills:catalog:${category||''}:${search||''}`;
    const cached = cache.get(ck);
    if (cached) return res.json(cached);

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };
    if (emerging === 'true') filter.isEmerging = true;
    const skills = await SkillNode.find(filter).sort({ demandScore: -1 }).limit(100).lean();
    const result = { success: true, skills };
    cache.set(ck, result, 300);
    res.json(result);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/catalog/:key', async (req, res) => {
  try {
    const skill = await SkillNode.findOne({ key: req.params.key.toLowerCase() }).lean();
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found.' });
    res.json({ success: true, skill });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/trending', async (req, res) => {
  try {
    const trending = await SkillNode.find({ isActive: true, trendDirection: 'rising' }).sort({ demandScore: -1 }).limit(20).lean();
    res.json({ success: true, trending });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ USER SKILL GRAPH (auth) ══════════

router.use(authenticateToken);

router.get('/graph', async (req, res) => {
  try {
    let graph = await UserSkillGraph.findOne({ userId: req.user.userId }).lean();
    if (!graph) graph = { userId: req.user.userId, skills: [], totalSkills: 0 };
    res.json({ success: true, graph });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/update', async (req, res) => {
  const { skills, targetRole, currentPath } = req.body;
  try {
    const totalSkills = skills?.length || 0;
    const verifiedSkills = (skills || []).filter(s => s.verified).length;
    const avgLevel = totalSkills > 0 ? Math.round((skills || []).reduce((s, sk) => s + (sk.level || 0), 0) / totalSkills) : 0;
    const graph = await UserSkillGraph.findOneAndUpdate(
      { userId: req.user.userId },
      { userId: req.user.userId, skills: skills || [], totalSkills, verifiedSkills, avgLevel, targetRole: targetRole || '', currentPath: currentPath || '', overallScore: Math.round((avgLevel * 0.5) + (verifiedSkills / Math.max(totalSkills, 1) * 50)) },
      { upsert: true, new: true }
    );
    res.json({ success: true, graph });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/verify', async (req, res) => {
  const { skillKey, source } = req.body;
  try {
    const graph = await UserSkillGraph.findOne({ userId: req.user.userId });
    if (!graph) return res.status(404).json({ success: false, message: 'Graph not found.' });
    const skill = graph.skills.find(s => s.skillKey === skillKey);
    if (skill) { skill.verified = true; skill.verifiedBy = source || 'assessment'; skill.verifiedAt = new Date(); }
    graph.verifiedSkills = graph.skills.filter(s => s.verified).length;
    await graph.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/endorse', async (req, res) => {
  const { targetUserId, skillKey } = req.body;
  try {
    const graph = await UserSkillGraph.findOne({ userId: targetUserId });
    if (!graph) return res.status(404).json({ success: false, message: 'User graph not found.' });
    const skill = graph.skills.find(s => s.skillKey === skillKey);
    if (skill) skill.endorsements = (skill.endorsements || 0) + 1;
    await graph.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ RECOMMENDATIONS ══════════

router.get('/recommendations', async (req, res) => {
  try {
    const graph = await UserSkillGraph.findOne({ userId: req.user.userId }).lean();
    const userSkillKeys = (graph?.skills || []).map(s => s.skillKey);
    // Find skills demanded in jobs but missing from user
    const demandedSkills = await SkillNode.find({ isActive: true, key: { $nin: userSkillKeys } }).sort({ demandScore: -1 }).limit(15).lean();
    res.json({ success: true, recommendations: demandedSkills });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ CAREER PATH ══════════

router.get('/career-path', async (req, res) => {
  try {
    const graph = await UserSkillGraph.findOne({ userId: req.user.userId }).lean();
    const userSkills = (graph?.skills || []).map(s => s.skillKey);
    // Simple career path suggestion based on skill count
    const paths = [
      { role: 'Junior Developer', requiredSkills: 3, salary: '₹4-8 LPA' },
      { role: 'Mid Developer', requiredSkills: 6, salary: '₹8-15 LPA' },
      { role: 'Senior Developer', requiredSkills: 10, salary: '₹15-30 LPA' },
      { role: 'Tech Lead', requiredSkills: 15, salary: '₹25-45 LPA' },
      { role: 'Engineering Manager', requiredSkills: 20, salary: '₹35-60 LPA' },
    ];
    const currentIdx = paths.findIndex(p => userSkills.length < p.requiredSkills) - 1;
    const currentRole = paths[Math.max(0, currentIdx)] || paths[0];
    const nextRole = paths[Math.min(currentIdx + 1, paths.length - 1)];
    res.json({ success: true, careerPath: { current: currentRole, next: nextRole, allPaths: paths, skillCount: userSkills.length } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ GAP ANALYSIS ══════════

router.post('/gaps', async (req, res) => {
  const { targetJobId, targetSkills } = req.body;
  try {
    const graph = await UserSkillGraph.findOne({ userId: req.user.userId }).lean();
    const userSkillKeys = new Set((graph?.skills || []).map(s => s.skillKey));
    let required = targetSkills || [];
    if (targetJobId) {
      const job = await Job.findById(targetJobId).select('skillsRequired').lean();
      required = (job?.skillsRequired || []).map(s => s.toLowerCase());
    }
    const matched = required.filter(s => userSkillKeys.has(s));
    const missing = required.filter(s => !userSkillKeys.has(s));
    const matchPercent = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 0;
    // Get learning info for missing skills
    const missingDetails = await SkillNode.find({ key: { $in: missing } }).select('key name avgLearningHours salaryImpact').lean();
    res.json({ success: true, gaps: { matchPercent, matched, missing, missingDetails, totalRequired: required.length } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SKILL HEATMAP ══════════

router.get('/heatmap', async (req, res) => {
  try {
    const graph = await UserSkillGraph.findOne({ userId: req.user.userId }).lean();
    const heatmap = (graph?.skills || []).map(s => ({ skill: s.name || s.skillKey, level: s.level, verified: s.verified, heatScore: s.heatScore, endorsements: s.endorsements }));
    res.json({ success: true, heatmap });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ANALYTICS ══════════

router.get('/analytics', async (req, res) => {
  try {
    const graph = await UserSkillGraph.findOne({ userId: req.user.userId }).lean();
    const byCategory = {};
    for (const s of (graph?.skills || [])) {
      const node = await SkillNode.findOne({ key: s.skillKey }).select('category').lean();
      const cat = node?.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
    res.json({ success: true, analytics: { totalSkills: graph?.totalSkills || 0, verifiedSkills: graph?.verifiedSkills || 0, avgLevel: graph?.avgLevel || 0, overallScore: graph?.overallScore || 0, byCategory } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ADMIN: Seed skill catalog ══════════

router.post('/admin/seed', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const node = await SkillNode.findOneAndUpdate({ key: req.body.key?.toLowerCase() }, { ...req.body, key: req.body.key?.toLowerCase() }, { upsert: true, new: true });
    res.json({ success: true, skill: node });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
