/**
 * /api/portfolio — Candidate portfolio CRUD
 */
import express from 'express';
import Portfolio from '../models/Portfolio.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/portfolio/me — Get own portfolio (auth required)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ userId: req.user.userId }).lean();
    if (!portfolio) portfolio = { userId: req.user.userId, projects: [], certifications: [], achievements: [], skills: [] };
    res.json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/portfolio/:userId — View someone's public portfolio
router.get('/:userId', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.params.userId, isPublic: true }).lean();
    if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found or is private.' });
    res.json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/portfolio — Create or update own portfolio
router.put('/', authenticateToken, async (req, res) => {
  try {
    const {
      headline, bio, portfolioUrl, githubUrl, linkedinUrl, blogUrl, videoUrl,
      projects, certifications, achievements, skills, isPublic,
    } = req.body;

    const update = {};
    if (headline !== undefined)       update.headline = headline;
    if (bio !== undefined)            update.bio = bio;
    if (portfolioUrl !== undefined)   update.portfolioUrl = portfolioUrl;
    if (githubUrl !== undefined)      update.githubUrl = githubUrl;
    if (linkedinUrl !== undefined)    update.linkedinUrl = linkedinUrl;
    if (blogUrl !== undefined)        update.blogUrl = blogUrl;
    if (videoUrl !== undefined)       update.videoUrl = videoUrl;
    if (Array.isArray(projects))      update.projects = projects;
    if (Array.isArray(certifications))update.certifications = certifications;
    if (Array.isArray(achievements))  update.achievements = achievements;
    if (Array.isArray(skills))        update.skills = skills;
    if (isPublic !== undefined)       update.isPublic = isPublic;

    const portfolio = await Portfolio.findOneAndUpdate(
      { userId: req.user.userId },
      { userId: req.user.userId, ...update },
      { upsert: true, new: true }
    );

    res.json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
