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
import Notification from '../models/Notification.js';
import CompanyFollow from '../models/CompanyFollow.js';
import { authenticateToken } from '../middleware/auth.js';
import { ensureCompanyFromJob } from '../utils/companyUtils.js';

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
    responsibilities, recruiterName, recruiterTitle, recruiterEmail,
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
      responsibilities:   Array.isArray(responsibilities) ? responsibilities : [],
      recruiterName:      recruiterName  || '',
      recruiterTitle:     recruiterTitle || '',
      recruiterEmail:     recruiterEmail || '',
      status:             'open',
      isExternal:         false,
      source:             'Recruiter',
      postedBy:           req.user.userId,
    });

    const saved = await job.save();
    const companyProfile = await ensureCompanyFromJob(saved);

    // Notify online users via Socket.io — targeted to matching candidates
    const io          = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    if (io) {
      // Broadcast full refresh to everyone (JobBrowser picks this up)
      io.emit('jobs:new', {
        jobs: [saved],
        newCount: 1,
        query: title,
        refreshedAt: new Date().toISOString(),
      });

      // Targeted: only notify online users whose skills/domain/location overlap with this job
      if (onlineUsers && onlineUsers.size > 0) {
        const jobSkillsLower    = (saved.skillsRequired || []).map(s => s.toLowerCase());
        const jobDomainLower    = (saved.domain || '').toLowerCase();
        const jobLocationLower  = (saved.location || '').toLowerCase();
        const isRemote          = jobLocationLower.includes('remote') || (saved.workMode || '').toLowerCase() === 'remote';

        for (const [onlineUserId, socketId] of onlineUsers.entries()) {
          try {
            const candidate = await User.findOne({ userId: onlineUserId }).select('skills domain preferredLocations role').lean();
            if (!candidate || candidate.role === 'recruiter' || candidate.role === 'admin') continue;

            const userSkillsLower = (candidate.skills || []).map(s => s.toLowerCase());
            const userDomainLower = (candidate.domain || '').toLowerCase();
            const userLocsLower   = (candidate.preferredLocations || []).map(l => l.toLowerCase());

            const skillMatch    = jobSkillsLower.length === 0 || jobSkillsLower.some(js => userSkillsLower.some(us => us.includes(js) || js.includes(us)));
            const domainMatch   = !jobDomainLower || !userDomainLower || jobDomainLower.includes(userDomainLower) || userDomainLower.includes(jobDomainLower);
            const locationMatch = isRemote || userLocsLower.length === 0 || userLocsLower.some(ul => jobLocationLower.includes(ul) || ul.includes(jobLocationLower));

            if (skillMatch || domainMatch || locationMatch) {
              const notification = await Notification.create({
                userId: onlineUserId,
                audience: 'candidate',
                type: 'new_matching_job',
                title: `New Job Match: ${saved.title}`,
                message: `${saved.company} is hiring in ${saved.location}`,
                icon: 'briefcase',
                metadata: { jobId: saved._id, company: saved.company },
              });
              io.to(socketId).emit('notification:receive', {
                id:      notification._id,
                type:    'new_job_match',
                title:   `🆕 New Job Match: ${saved.title}`,
                message: `${saved.company} is hiring in ${saved.location}${saved.matchScore ? ` · ${saved.matchScore}% match` : ''}`,
                time:    'Just now',
                read:    false,
                icon:    '💼',
              });
            }
          } catch { /* skip user if lookup fails */ }
        }
      }

      if (companyProfile && onlineUsers) {
        const follows = await CompanyFollow.find({ companyId: companyProfile._id }).lean();
        await Promise.all(follows.map(async (follow) => {
          const notification = await Notification.create({
            userId: follow.userId,
            audience: 'candidate',
            type: 'followed_company_job',
            title: `${saved.company} posted a new job`,
            message: `${saved.title} is open in ${saved.location}`,
            icon: 'building',
            metadata: { jobId: saved._id, companyId: companyProfile._id },
          });
          const targetSocket = onlineUsers.get(follow.userId);
          if (targetSocket) io.to(targetSocket).emit('notification:receive', notification);
        }));
      }
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
      'responsibilities', 'recruiterName', 'recruiterTitle', 'recruiterEmail',
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
    await ensureCompanyFromJob(saved);
    const io = req.app.get('io');
    if (io) io.emit('jobs:updated', { job: saved, updatedAt: new Date().toISOString() });
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
    const io = req.app.get('io');
    if (io) io.emit(status === 'closed' ? 'jobs:closed' : 'jobs:updated', { job, jobId: job._id, updatedAt: new Date().toISOString() });
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
    const savedNotification = await Notification.create({
      userId: match.userId,
      audience: 'candidate',
      type: 'application_update',
      title: 'Application status updated',
      message: `Your application for ${match.jobId?.title} is now ${status.replace('_', ' ')}`,
      icon: 'clipboard',
      metadata: { matchId: match._id, jobId: match.jobId?._id, status },
    });

    // Notify the candidate via Socket.io
    const io = req.app.get('io');
    if (io) {
      const notif = {
        id: savedNotification._id,
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
