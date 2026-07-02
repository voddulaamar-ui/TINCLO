/**
 * /api/recruiter — Recruiter-only routes
 *
 * All routes require JWT + recruiter (or admin) role.
 * Recruiters can only manage jobs they created (postedBy === req.user.userId).
 */

import express from 'express';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ── Auth middleware: must be authenticated ─────────────────────────────────
router.use(authenticateToken);

// ── requireRecruiter — allow recruiter OR admin ────────────────────────────
const requireRecruiter = (req, res, next) => {
  if (req.user?.role !== 'recruiter' && req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Recruiter access required.' });
  }
  next();
};

// ── POST /api/recruiter/jobs — create a new job ────────────────────────────
router.post('/jobs', requireRecruiter, async (req, res) => {
  const {
    title, company, description, salary, location,
    companyDescription, companyLogo, domain, skillsRequired,
    workMode, jobType, experienceRequired, deadline, tags,
  } = req.body;

  if (!title || !company || !description || !location) {
    return res.status(400).json({ message: 'title, company, description and location are required.' });
  }

  try {
    const job = new Job({
      title:              title.trim(),
      company:            company.trim(),
      description,
      salary:             salary || 'Salary not disclosed',
      location:           location.trim(),
      companyDescription: companyDescription || '',
      companyLogo:        companyLogo || null,
      domain:             domain || '',
      skillsRequired:     Array.isArray(skillsRequired) ? skillsRequired : [],
      requirements:       Array.isArray(skillsRequired) ? skillsRequired : [],
      workMode:           workMode || '',
      jobType:            jobType || 'Full-time',
      experienceRequired: experienceRequired || '',
      experience:         experienceRequired || '',
      deadline:           deadline ? new Date(deadline) : null,
      tags:               Array.isArray(tags) ? tags : [],
      status:             'open',
      isExternal:         false,
      source:             'Recruiter',
      postedBy:           req.user.userId,
    });

    const saved = await job.save();

    // Notify online users via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('jobs:new', {
        jobs: [saved],
        newCount: 1,
        query: title,
        refreshedAt: new Date().toISOString(),
      });
      io.emit('jobs:match', {
        title: `🆕 New Job Posted: ${saved.title}`,
        message: `${saved.company} is hiring for ${saved.title} in ${saved.location}`,
        matchedJobs: [saved],
        icon: '💼',
      });
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/recruiter/jobs — list own jobs ────────────────────────────────
router.get('/jobs', requireRecruiter, async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? {}
      : { postedBy: req.user.userId };

    const jobs = await Job.find(filter).sort({ createdAt: -1 });

    // Attach applicant count for each job
    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const applicantCount = await Match.countDocuments({ jobId: job._id });
        return { ...job.toObject(), applicantCount };
      }),
    );

    res.json(jobsWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/recruiter/jobs/:id — single job (must be owner) ──────────────
router.get('/jobs/:id', requireRecruiter, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (req.user.role !== 'admin' && job.postedBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /api/recruiter/jobs/:id — edit job ────────────────────────────────
router.put('/jobs/:id', requireRecruiter, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (req.user.role !== 'admin' && job.postedBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const updatable = [
      'title', 'company', 'description', 'salary', 'location',
      'companyDescription', 'companyLogo', 'domain', 'skillsRequired',
      'workMode', 'jobType', 'experienceRequired', 'deadline', 'tags', 'status',
    ];

    for (const field of updatable) {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    }
    // Keep requirements in sync
    if (req.body.skillsRequired) job.requirements = req.body.skillsRequired;
    if (req.body.experienceRequired) job.experience = req.body.experienceRequired;

    const saved = await job.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE /api/recruiter/jobs/:id — delete job ───────────────────────────
router.delete('/jobs/:id', requireRecruiter, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (req.user.role !== 'admin' && job.postedBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    await job.deleteOne();
    res.json({ message: 'Job deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/recruiter/jobs/:id/status — open or close a job ─────────────
router.patch('/jobs/:id/status', requireRecruiter, async (req, res) => {
  const { status } = req.body;
  if (!['open', 'closed'].includes(status)) {
    return res.status(400).json({ message: 'status must be "open" or "closed".' });
  }
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (req.user.role !== 'admin' && job.postedBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    job.status = status;
    await job.save();
    res.json({ message: `Job ${status === 'open' ? 'reopened' : 'closed'}.`, job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/recruiter/jobs/:id/applicants — list applicants ──────────────
router.get('/jobs/:id/applicants', requireRecruiter, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (req.user.role !== 'admin' && job.postedBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const matches = await Match.find({ jobId: req.params.id, applied: true })
      .sort({ matchedAt: -1 });

    // Enrich with user profile
    const applicants = await Promise.all(
      matches.map(async (m) => {
        const user = await User.findOne({ userId: m.userId }).select('-password');
        return {
          matchId: m._id,
          userId: m.userId,
          applicationStatus: m.applicationStatus,
          matchScore: m.matchScore,
          matchDetails: m.matchDetails,
          appliedAt: m.matchedAt,
          statusUpdatedAt: m.statusUpdatedAt,
          user: user || null,
        };
      }),
    );

    res.json(applicants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/recruiter/applications/:matchId/status — update app status ─
router.patch('/applications/:matchId/status', requireRecruiter, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['saved', 'applied', 'under_review', 'interview_scheduled', 'offer', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const match = await Match.findById(req.params.matchId).populate('jobId');
    if (!match) return res.status(404).json({ message: 'Application not found.' });

    // Verify recruiter owns this job
    if (req.user.role !== 'admin' && match.jobId?.postedBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    match.applicationStatus = status;
    match.statusUpdatedAt = new Date();
    if (status === 'applied') match.applied = true;
    await match.save();

    // Notify the candidate via Socket.io
    const io = req.app.get('io');
    if (io) {
      const notif = {
        id: Date.now(),
        type: 'application_update',
        title: '📋 Application Status Updated',
        message: `Your application for ${match.jobId?.title} is now: ${status.replace('_', ' ')}`,
        time: 'Just now',
        read: false,
        icon: '📋',
      };
      const onlineUsers = req.app.get('onlineUsers');
      if (onlineUsers) {
        const targetSocket = onlineUsers.get(match.userId);
        if (targetSocket) io.to(targetSocket).emit('notification:receive', notif);
      }
    }

    res.json({ message: 'Status updated.', match });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
