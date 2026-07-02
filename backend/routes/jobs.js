import express from 'express';
import Job from '../models/Job.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/jobs — fetch jobs with optional search & filters
// Open to all (no auth required for browsing)
router.get('/', async (req, res) => {
  try {
    const {
      search, domain, workMode, jobType, location,
      minExp, maxExp, status, sort, page = 1, limit = 50,
    } = req.query;

    const filter = {};

    // Text search across title, company, description
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

    if (domain)   filter.domain  = new RegExp(domain, 'i');
    if (workMode) filter.workMode = workMode;
    if (jobType)  filter.jobType  = jobType;
    if (location) filter.location = new RegExp(location, 'i');
    if (status)   filter.status   = status;
    else          filter.status   = 'open'; // default: only open jobs

    // Experience range filter (numeric years embedded in string like "2-4 years")
    if (minExp || maxExp) {
      // We store experience as a string; filter by regex for simplicity
      // Frontend MatchingService handles detailed scoring
    }

    const sortOpt = sort === 'oldest'
      ? { createdAt: 1 }
      : sort === 'salary'
        ? { salary: -1 }
        : { createdAt: -1 }; // default newest first

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort(sortOpt).skip(skip).limit(parseInt(limit)),
      Job.countDocuments(filter),
    ]);

    res.json({ jobs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/jobs/:id — single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/jobs — create job (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const job = new Job({
      title:       req.body.title,
      company:     req.body.company,
      description: req.body.description,
      salary:      req.body.salary,
      location:    req.body.location,
      domain:      req.body.domain      || '',
      workMode:    req.body.workMode    || '',
      jobType:     req.body.jobType     || 'Full-time',
      skillsRequired: req.body.skillsRequired || [],
      requirements:   req.body.skillsRequired || req.body.requirements || [],
      experienceRequired: req.body.experienceRequired || '',
      experience:   req.body.experienceRequired || '',
      tags:         req.body.tags || [],
      status:       'open',
      postedBy:     req.user.userId,
    });
    const newJob = await job.save();
    res.status(201).json(newJob);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/jobs/:id — update job (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/jobs/:id — delete job (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await job.deleteOne();
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
