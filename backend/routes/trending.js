import express from 'express';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import RecentView from '../models/RecentView.js';
import cache from '../utils/cache.js';

const router = express.Router();

router.get('/jobs', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 12);
    const cacheKey = `trending:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const jobs = await Job.find({ status: 'open' })
      .select('title company salary location domain workMode skillsRequired createdAt companyLogo')
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();
    const ranked = await Promise.all(jobs.map(async job => {
      const [views, saves, applications] = await Promise.all([
        RecentView.countDocuments({ jobId: job._id }),
        Match.countDocuments({ jobId: job._id }),
        Match.countDocuments({ jobId: job._id, applied: true }),
      ]);
      const score = views + saves * 3 + applications * 5;
      const badges = [];
      if (score >= 12) badges.push('Trending');
      if (saves >= 5) badges.push('Popular');
      if (applications >= 3) badges.push('Hiring Fast');
      return { ...job, metrics: { views, saves, applications, score }, badges: badges.length ? badges : ['New'] };
    }));
    ranked.sort((a, b) => b.metrics.score - a.metrics.score || new Date(b.createdAt) - new Date(a.createdAt));
    const result = ranked.slice(0, limit);
    cache.set(cacheKey, result, 60); // cache 60s
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
