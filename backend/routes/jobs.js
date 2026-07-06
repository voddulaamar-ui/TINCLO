import express from 'express';
import Job from '../models/Job.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import cache from '../utils/cache.js';

const router = express.Router();

// Fields to return for list views (exclude heavy description for faster payloads)
const LIST_FIELDS = 'title company salary location domain workMode jobType experienceRequired status companyLogo skillsRequired tags createdAt postedAt deadline matchScore';

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/jobs — paginated job list with filters
// ══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const {
      search, domain, workMode, jobType, location,
      company, salary, status, sort,
    } = req.query;

    const { page, limit, skip } = parsePagination(req.query, { limit: 20 });

    const filter = {};

    // Text search across multiple fields
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { title: regex },
        { company: regex },
        { description: regex },
        { skillsRequired: regex },
        { requirements: regex },
        { tags: regex },
      ];
    }

    if (domain)   filter.domain   = new RegExp(domain, 'i');
    if (workMode) filter.workMode = workMode;
    if (jobType)  filter.jobType  = new RegExp(jobType, 'i');
    if (location) filter.location = new RegExp(location, 'i');
    if (company)  filter.company  = new RegExp(company, 'i');
    if (salary)   filter.salary   = new RegExp(salary, 'i');
    if (status)   filter.status   = status;
    else          filter.status   = 'open';

    const sortOpt = sort === 'oldest' ? { createdAt: 1 }
                  : sort === 'salary' ? { salary: -1 }
                  : { createdAt: -1 };

    // Try cache for first page without search
    const cacheKey = !search && page === 1 ? `jobs:${domain||''}:${workMode||''}:${location||''}:p1` : null;
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .select(LIST_FIELDS)
        .sort(sortOpt)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    const response = paginatedResponse(jobs, total, page, limit, { jobs });

    if (cacheKey) cache.set(cacheKey, response, 30); // cache 30s

    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/jobs/:id — single job (full details)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `job:${req.params.id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    cache.set(cacheKey, job, 120); // cache 2 min
    res.json(job);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/jobs — create job (admin only)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const job = new Job({
      title:              req.body.title,
      company:            req.body.company,
      description:        req.body.description,
      salary:             req.body.salary,
      location:           req.body.location,
      domain:             req.body.domain      || '',
      workMode:           req.body.workMode    || '',
      jobType:            req.body.jobType     || 'Full-time',
      skillsRequired:     req.body.skillsRequired || [],
      requirements:       req.body.skillsRequired || req.body.requirements || [],
      experienceRequired: req.body.experienceRequired || '',
      experience:         req.body.experienceRequired || '',
      tags:               req.body.tags || [],
      status:             'open',
      postedBy:           req.user.userId,
    });
    const newJob = await job.save();
    cache.invalidatePrefix('jobs:'); // bust list cache
    res.status(201).json({ success: true, job: newJob });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/jobs/:id — update job (admin only)
// ══════════════════════════════════════════════════════════════════════════════
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    cache.del(`job:${req.params.id}`);
    cache.invalidatePrefix('jobs:');
    res.json({ success: true, job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/jobs/:id — delete job (admin only)
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    await job.deleteOne();
    cache.del(`job:${req.params.id}`);
    cache.invalidatePrefix('jobs:');
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
