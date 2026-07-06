/**
 * /api/tos — TINCLO Operating System Kernel
 * Universal identity, role switching, universal search, workspace, cross-module intelligence, app store.
 */
import express from 'express';
import UserIdentity from '../models/tos/UserIdentity.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { authenticateToken } from '../middleware/auth.js';
import cache from '../utils/cache.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ UNIVERSAL IDENTITY ══════════

router.get('/identity', async (req, res) => {
  try {
    let identity = await UserIdentity.findOne({ userId: req.user.userId }).lean();
    if (!identity) {
      identity = await UserIdentity.create({ userId: req.user.userId, activeRole: req.user.role || 'candidate', roles: [req.user.role || 'candidate'] });
    }
    res.json({ success: true, identity });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/identity/role', async (req, res) => {
  const { role } = req.body;
  try {
    const identity = await UserIdentity.findOne({ userId: req.user.userId });
    if (!identity) return res.status(404).json({ success: false, message: 'Identity not found.' });
    if (!identity.roles.includes(role)) identity.roles.push(role);
    identity.activeRole = role;
    await identity.save();
    res.json({ success: true, activeRole: role, roles: identity.roles });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/identity/preferences', async (req, res) => {
  try {
    const identity = await UserIdentity.findOneAndUpdate(
      { userId: req.user.userId },
      { preferences: req.body, userId: req.user.userId },
      { upsert: true, new: true }
    );
    res.json({ success: true, preferences: identity.preferences });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ UNIVERSAL SEARCH ══════════

router.get('/search', async (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Query required.' });

  try {
    const regex = new RegExp(q, 'i');
    const results = {};

    if (!type || type === 'jobs') {
      results.jobs = await Job.find({ $or: [{ title: regex }, { company: regex }], status: 'open' })
        .select('title company location salary').limit(5).lean();
    }
    if (!type || type === 'people') {
      results.people = await User.find({ $or: [{ name: regex }, { email: regex }] })
        .select('name email role userId profilePicture').limit(5).lean();
    }
    if (!type || type === 'organizations') {
      results.organizations = await Organization.find({ name: regex })
        .select('name slug industry logo').limit(5).lean();
    }

    const totalResults = Object.values(results).reduce((s, arr) => s + arr.length, 0);
    res.json({ success: true, query: q, totalResults, results });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ WORKSPACE ══════════

router.get('/workspace', async (req, res) => {
  try {
    const identity = await UserIdentity.findOne({ userId: req.user.userId }).lean();
    res.json({
      success: true,
      workspace: {
        activeRole: identity?.activeRole || 'candidate',
        roles: identity?.roles || ['candidate'],
        pinnedApps: identity?.preferences?.pinnedApps || [],
        theme: identity?.preferences?.theme || 'system',
        modules: [
          { key: 'recruitment', name: 'Recruitment', icon: '💼', available: true },
          { key: 'hrms', name: 'HRMS', icon: '🏢', available: true },
          { key: 'learning', name: 'Learning', icon: '📚', available: true },
          { key: 'assessments', name: 'Assessments', icon: '📝', available: true },
          { key: 'community', name: 'Community', icon: '👥', available: true },
          { key: 'messaging', name: 'Messages', icon: '💬', available: true },
          { key: 'marketplace', name: 'Marketplace', icon: '🛍️', available: true },
          { key: 'ai', name: 'AI Studio', icon: '🤖', available: true },
          { key: 'analytics', name: 'Analytics', icon: '📊', available: true },
          { key: 'automation', name: 'Automation', icon: '⚡', available: true },
          { key: 'events', name: 'Events', icon: '📅', available: true },
          { key: 'coding', name: 'Coding', icon: '💻', available: true },
          { key: 'mentorship', name: 'Mentorship', icon: '🎓', available: true },
          { key: 'freelance', name: 'Freelance', icon: '🌐', available: true },
        ],
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ CROSS-MODULE INTELLIGENCE ══════════

router.get('/intelligence', async (req, res) => {
  try {
    const ck = `tos:intelligence:${req.user.userId}`;
    const cached = cache.get(ck);
    if (cached) return res.json(cached);

    // Aggregate cross-module insights for the user
    const user = await User.findOne({ userId: req.user.userId }).select('skills domain experienceYears').lean();
    const matchingJobs = user?.skills?.length
      ? await Job.countDocuments({ status: 'open', skillsRequired: { $in: user.skills.map(s => new RegExp(s, 'i')) } })
      : 0;

    const result = {
      success: true,
      intelligence: {
        matchingJobs,
        skillCount: user?.skills?.length || 0,
        domain: user?.domain || '',
        recommendations: [
          matchingJobs > 0 ? `${matchingJobs} jobs match your skills` : 'Complete your profile to get job matches',
          'Continue your learning streak',
          'Check your AI career coach for personalized advice',
        ],
      },
    };
    cache.set(ck, result, 300);
    res.json(result);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ENTERPRISE APP STORE ══════════

router.get('/app-store', async (req, res) => {
  res.json({
    success: true,
    apps: [
      { key: 'recruitment', name: 'Recruitment Hub', category: 'core', icon: '💼', installed: true },
      { key: 'hrms', name: 'Enterprise HRMS', category: 'core', icon: '🏢', installed: true },
      { key: 'learning', name: 'Learning Platform', category: 'core', icon: '📚', installed: true },
      { key: 'assessments', name: 'Assessment Engine', category: 'core', icon: '📝', installed: true },
      { key: 'ai_studio', name: 'AI Studio', category: 'ai', icon: '🤖', installed: true },
      { key: 'ai_agents', name: 'AI Agent Marketplace', category: 'ai', icon: '🧠', installed: true },
      { key: 'marketplace', name: 'Talent Marketplace', category: 'marketplace', icon: '🛍️', installed: true },
      { key: 'bi_studio', name: 'BI Studio', category: 'analytics', icon: '📊', installed: true },
      { key: 'bpm', name: 'BPM Engine', category: 'automation', icon: '⚙️', installed: true },
      { key: 'plugins', name: 'Plugin Marketplace', category: 'developer', icon: '🧩', installed: true },
      { key: 'university', name: 'University Platform', category: 'education', icon: '🎓', installed: false },
      { key: 'government', name: 'Government Recruitment', category: 'government', icon: '🏛️', installed: false },
      { key: 'healthcare', name: 'Healthcare HR', category: 'industry', icon: '🏥', installed: false },
      { key: 'manufacturing', name: 'Manufacturing HR', category: 'industry', icon: '🏭', installed: false },
    ],
  });
});

// ══════════ SYSTEM STATUS ══════════

router.get('/status', async (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    system: {
      version: '30.0.0',
      phase: 30,
      name: 'TINCLO Operating System',
      status: 'operational',
      uptime: Math.floor(process.uptime()),
      memory: `${Math.round(mem.heapUsed / 1048576)}MB`,
      modules: 30,
      apiEndpoints: '1200+',
      collections: '140+',
    },
  });
});

export default router;
