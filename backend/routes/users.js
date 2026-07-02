import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Job from '../models/Job.js';
import JobView from '../models/JobView.js';

const router = express.Router();

// POST /api/users — Register a new user (legacy compatibility)
router.post('/', async (req, res) => {
  const { userId, name, email, password } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  try {
    if (email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 12) : '';
    const user = new User({ userId, name: name || '', email: email || '', password: hashedPassword });
    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// GET /api/users — Get all users (admin view)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/data — Full database summary (admin fallback)
router.get('/data', async (req, res) => {
  try {
    const [users, matches, jobs, jobViews] = await Promise.all([
      User.find().sort({ createdAt: -1 }).select('-password'),
      Match.find().populate('jobId').sort({ matchedAt: -1 }),
      Job.find().sort({ createdAt: -1 }),
      JobView.find().populate('jobId').sort({ viewedAt: -1 })
    ]);

    res.json({
      summary: {
        totalUsers: users.length,
        totalMatches: matches.length,
        appliedMatches: matches.filter(m => m.applied).length,
        totalJobs: jobs.length,
        totalJobViews: jobViews.length
      },
      users,
      matches,
      jobs,
      jobViews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/:userId — Get user by userId
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/users/:userId
router.delete('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
