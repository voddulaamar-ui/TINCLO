import express from 'express';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Job from '../models/Job.js';
import JobView from '../models/JobView.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateToken, requireAdmin);

// GET /api/admin/dashboard — summary stats
router.get('/dashboard', async (req, res) => {
  try {
    const [totalUsers, totalMatches, appliedMatches, totalJobs, totalJobViews, recentUsers] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Match.countDocuments(),
      Match.countDocuments({ applied: true }),
      Job.countDocuments(),
      JobView.countDocuments(),
      User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('-password'),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalMatches,
        appliedMatches,
        totalJobs,
        totalJobViews,
        conversionRate: totalMatches > 0 ? ((appliedMatches / totalMatches) * 100).toFixed(1) : 0,
      },
      recentUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/users — all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/matches — all matches
router.get('/matches', async (req, res) => {
  try {
    const matches = await Match.find().populate('jobId').sort({ matchedAt: -1 }).limit(100);
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/jobs - jobs currently stored in MongoDB
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(200);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/job-views - jobs seen by registered users
router.get('/job-views', async (req, res) => {
  try {
    const views = await JobView.find().populate('jobId').sort({ viewedAt: -1 }).limit(200);
    res.json(views);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
