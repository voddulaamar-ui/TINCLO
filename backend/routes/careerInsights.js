/**
 * /api/career-insights — Career insights dashboard + learning suggestions
 * 
 * Uses MongoDB aggregation pipelines on the Job collection to derive:
 * - Most demanded skills
 * - Most hiring companies
 * - Popular locations
 * - Salary ranges
 * - Fastest growing domains
 * - Skill gap analysis + learning recommendations
 */
import express from 'express';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import cache from '../utils/cache.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/career-insights/overview — Platform-wide career insights (public)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/overview', async (req, res) => {
  try {
    const cacheKey = 'career-insights:overview';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Top skills across all open jobs
    const topSkills = await Job.aggregate([
      { $match: { status: 'open' } },
      { $unwind: '$skillsRequired' },
      { $group: { _id: { $toLower: '$skillsRequired' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { skill: '$_id', count: 1, _id: 0 } },
    ]);

    // Most hiring companies
    const topCompanies = await Job.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$company', openJobs: { $sum: 1 } } },
      { $sort: { openJobs: -1 } },
      { $limit: 15 },
      { $project: { company: '$_id', openJobs: 1, _id: 0 } },
    ]);

    // Popular locations
    const topLocations = await Job.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
      { $project: { location: '$_id', count: 1, _id: 0 } },
    ]);

    // Domain distribution
    const domains = await Job.aggregate([
      { $match: { status: 'open', domain: { $ne: '' } } },
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
      { $project: { domain: '$_id', count: 1, _id: 0 } },
    ]);

    // Work mode distribution
    const workModes = await Job.aggregate([
      { $match: { status: 'open', workMode: { $ne: '' } } },
      { $group: { _id: '$workMode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { mode: '$_id', count: 1, _id: 0 } },
    ]);

    // Monthly hiring trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const hiringTrend = await Job.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', jobsPosted: '$count', _id: 0 } },
    ]);

    const response = {
      success: true,
      topSkills,
      topCompanies,
      topLocations,
      domains,
      workModes,
      hiringTrend,
      totalOpenJobs: await Job.countDocuments({ status: 'open' }),
    };

    cache.set(cacheKey, response, 300); // cache 5 min
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/career-insights/skill-gap — Personal skill gap + learning suggestions
// ══════════════════════════════════════════════════════════════════════════════
router.get('/skill-gap', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('skills domain').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const userSkills = (user.skills || []).map(s => s.toLowerCase());

    // Find skills demanded in jobs matching user's domain
    const filter = { status: 'open' };
    if (user.domain) filter.domain = new RegExp(user.domain, 'i');

    const demandedSkills = await Job.aggregate([
      { $match: filter },
      { $unwind: '$skillsRequired' },
      { $group: { _id: { $toLower: '$skillsRequired' }, demand: { $sum: 1 } } },
      { $sort: { demand: -1 } },
      { $limit: 30 },
    ]);

    // Split into matched vs missing
    const matchedSkills = [];
    const missingSkills = [];

    for (const { _id: skill, demand } of demandedSkills) {
      if (userSkills.includes(skill)) {
        matchedSkills.push({ skill, demand });
      } else {
        missingSkills.push({ skill, demand });
      }
    }

    // Learning suggestions for top missing skills
    const LEARNING_MAP = {
      'docker': ['Docker Basics (freeCodeCamp)', 'Docker for Developers (Udemy)', 'Docker Hands-On Projects'],
      'kubernetes': ['Kubernetes Crash Course (YouTube)', 'K8s for Beginners (Coursera)', 'CKA Certification Prep'],
      'typescript': ['TypeScript Handbook (official)', 'TypeScript Deep Dive', 'Building Apps with TS (Udemy)'],
      'react': ['React Official Tutorial', 'Full React Course (freeCodeCamp)', 'React Projects (YouTube)'],
      'node.js': ['Node.js Crash Course', 'REST APIs with Node (Udemy)', 'Node.js Design Patterns'],
      'python': ['Python for Everybody (Coursera)', 'Automate the Boring Stuff', 'Python Projects'],
      'aws': ['AWS Cloud Practitioner', 'AWS Solutions Architect (Udemy)', 'AWS Free Tier Labs'],
      'graphql': ['GraphQL Official Docs', 'Full-Stack GraphQL (Udemy)', 'Apollo Client Tutorial'],
      'mongodb': ['MongoDB University (free)', 'MongoDB Crash Course', 'MERN Stack Projects'],
      'machine learning': ['ML by Andrew Ng (Coursera)', 'Hands-On ML (book)', 'Kaggle Competitions'],
      'sql': ['SQL for Data Science (Coursera)', 'SQLBolt (interactive)', 'PostgreSQL Tutorial'],
      'git': ['Git & GitHub Crash Course', 'Pro Git (free book)', 'Interactive Git Branching'],
    };

    const learningSuggestions = missingSkills.slice(0, 8).map(({ skill, demand }) => ({
      skill,
      demand,
      resources: LEARNING_MAP[skill] || [
        `${skill} Crash Course (YouTube)`,
        `${skill} for Beginners (Udemy)`,
        `${skill} Documentation`,
      ],
    }));

    // Career roadmap suggestion based on domain
    const ROADMAP = {
      'frontend':    ['Junior Frontend Dev', 'Frontend Developer', 'Senior Frontend Dev', 'Lead Frontend Engineer', 'Frontend Architect'],
      'backend':     ['Junior Backend Dev', 'Backend Developer', 'Senior Backend Dev', 'Lead Engineer', 'Software Architect'],
      'full stack':  ['Junior Developer', 'Full Stack Developer', 'Senior Full Stack Dev', 'Tech Lead', 'Engineering Manager'],
      'data science':['Data Analyst', 'Data Scientist', 'Senior Data Scientist', 'Lead Data Scientist', 'Head of Data'],
      'devops':      ['Junior DevOps', 'DevOps Engineer', 'Senior DevOps', 'Platform Engineer', 'SRE Lead'],
      'mobile':      ['Junior Mobile Dev', 'Mobile Developer', 'Senior Mobile Dev', 'Mobile Lead', 'Mobile Architect'],
    };

    const domainKey = (user.domain || '').toLowerCase();
    const roadmap = Object.entries(ROADMAP).find(([k]) => domainKey.includes(k));

    res.json({
      success: true,
      userSkills: user.skills || [],
      matchedSkills: matchedSkills.slice(0, 10),
      missingSkills: missingSkills.slice(0, 10),
      learningSuggestions,
      careerRoadmap: roadmap ? { domain: roadmap[0], stages: roadmap[1] } : null,
      skillMatchPercent: demandedSkills.length
        ? Math.round((matchedSkills.length / Math.min(demandedSkills.length, 15)) * 100)
        : 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/career-insights/recommendations — Personalized job recommendations
// ══════════════════════════════════════════════════════════════════════════════
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId })
      .select('skills domain preferredLocations experienceYears').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Build personalized filter
    const filter = { status: 'open' };
    const orConditions = [];

    if (user.skills?.length) {
      orConditions.push({ skillsRequired: { $in: user.skills.map(s => new RegExp(s, 'i')) } });
    }
    if (user.domain) {
      orConditions.push({ domain: new RegExp(user.domain, 'i') });
    }
    if (user.preferredLocations?.length) {
      orConditions.push({ location: { $in: user.preferredLocations.map(l => new RegExp(l, 'i')) } });
    }

    if (orConditions.length) filter.$or = orConditions;

    // Recently posted jobs matching profile
    const recommended = await Job.find(filter)
      .select('title company salary location domain workMode skillsRequired createdAt companyLogo')
      .sort({ createdAt: -1 }).limit(20).lean();

    // Remote opportunities
    const remoteJobs = await Job.find({ status: 'open', workMode: 'Remote' })
      .select('title company salary location domain createdAt')
      .sort({ createdAt: -1 }).limit(10).lean();

    // Recently posted (last 48h)
    const recentCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentlyPosted = await Job.find({ status: 'open', createdAt: { $gte: recentCutoff } })
      .select('title company salary location domain createdAt')
      .sort({ createdAt: -1 }).limit(10).lean();

    res.json({
      success: true,
      recommended,
      remoteJobs,
      recentlyPosted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
