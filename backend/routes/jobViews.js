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

  // If jobId is not a valid ObjectId (e.g. external job), store as string reference
  const isValidObjectId = mongoose.Types.ObjectId.isValid(jobId);

  try {
    // Only look up user/job if we have a valid ObjectId
    if (isValidObjectId) {
      const job = await Job.findById(jobId);
      if (!job) return res.status(404).json({ message: 'Job not found' });
    }

    const view = await JobView.findOneAndUpdate(
      { userId, jobId: isValidObjectId ? jobId : undefined, externalJobId: !isValidObjectId ? jobId : undefined },
      { $set: { userId, jobId: isValidObjectId ? jobId : undefined, externalJobId: !isValidObjectId ? jobId : undefined, viewedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (isValidObjectId) {
      await RecentView.findOneAndUpdate(
        { userId, jobId },
        { userId, jobId, viewedAt: new Date() },
        { upsert: true, new: true },
      ).catch(() => {});
    }
    await AnalyticsEvent.create({ userId, jobId: isValidObjectId ? jobId : undefined, eventType: 'job_viewed', metadata: { rawJobId: jobId } }).catch(() => {});

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
