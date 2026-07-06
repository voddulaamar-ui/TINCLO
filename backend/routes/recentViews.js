import express from 'express';
import mongoose from 'mongoose';
import RecentView from '../models/RecentView.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const views = await RecentView.find({ userId: req.user.userId })
      .populate('jobId')
      .sort({ viewedAt: -1 })
      .limit(20); // spec: store last 20 viewed jobs
    res.json(views);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(jobId)) return res.status(400).json({ message: 'Invalid jobId' });
    const view = await RecentView.findOneAndUpdate(
      { userId: req.user.userId, jobId },
      { userId: req.user.userId, jobId, viewedAt: new Date() },
      { upsert: true, new: true },
    );
    await AnalyticsEvent.create({ userId: req.user.userId, eventType: 'job_viewed', jobId });
    // Keep only the 20 most recent; prune older ones
    const stale = await RecentView.find({ userId: req.user.userId }).sort({ viewedAt: -1 }).skip(20).select('_id');
    if (stale.length) await RecentView.deleteMany({ _id: { $in: stale.map(v => v._id) } });
    res.status(201).json(view);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
