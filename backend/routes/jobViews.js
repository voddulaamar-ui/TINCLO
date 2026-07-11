import express from 'express';
import mongoose from 'mongoose';
import JobView from '../models/JobView.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import RecentView from '../models/RecentView.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';

const router = express.Router();

// POST /api/job-views - record that a registered user saw a job
router.post('/', async (req, res) => {
  const { userId, jobId } = req.body;

  if (!userId || !jobId) {
    return res.status(400).json({ message: 'userId and jobId are required' });
  }

  // Skip tracking for non-MongoDB job IDs (external jobs)
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    return res.status(200).json({ message: 'External job view noted', skipped: true });
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(200).json({ message: 'Job not found, view skipped', skipped: true });
    }

    const view = await JobView.findOneAndUpdate(
      { userId, jobId },
      { $set: { viewedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await RecentView.findOneAndUpdate(
      { userId, jobId },
      { userId, jobId, viewedAt: new Date() },
      { upsert: true, new: true },
    ).catch(() => {});
    await AnalyticsEvent.create({ userId, jobId, eventType: 'job_viewed' }).catch(() => {});

    res.status(201).json(view);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/job-views/user/:userId - viewed jobs for a registered user
router.get('/user/:userId', async (req, res) => {
  try {
    const views = await JobView.find({ userId: req.params.userId })
      .populate('jobId')
      .sort({ viewedAt: -1 });

    res.json(views);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
