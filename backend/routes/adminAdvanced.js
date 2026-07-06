/**
 * /api/admin/advanced — Platform-wide analytics + moderation tools
 * All routes require admin role.
 */
import express from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import Interview from '../models/Interview.js';
import Offer from '../models/Offer.js';
import Company from '../models/Company.js';
import Notification from '../models/Notification.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import cache from '../utils/cache.js';

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/advanced/stats — Platform-wide statistics
// ══════════════════════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = 'admin:platform-stats';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [
      totalUsers, totalRecruiters, totalCandidates, totalAdmins,
      totalJobs, openJobs, closedJobs,
      totalApplications, totalInterviews, totalOffers,
      totalCompanies,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'recruiter' }),
      User.countDocuments({ role: { $in: ['user', 'candidate'] } }),
      User.countDocuments({ role: 'admin' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      Job.countDocuments({ status: 'closed' }),
      Match.countDocuments({ applied: true }),
      Interview.countDocuments(),
      Offer.countDocuments(),
      Company.countDocuments(),
    ]);

    // Most active companies (by job count)
    const topCompanies = await Job.aggregate([
      { $group: { _id: '$company', jobCount: { $sum: 1 } } },
      { $sort: { jobCount: -1 } },
      { $limit: 10 },
      { $project: { company: '$_id', jobCount: 1, _id: 0 } },
    ]);

    // Most popular technologies
    const topTechs = await Job.aggregate([
      { $unwind: '$skillsRequired' },
      { $group: { _id: { $toLower: '$skillsRequired' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
      { $project: { skill: '$_id', count: 1, _id: 0 } },
    ]);

    // Monthly registrations (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const registrationTrend = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', users: '$count', _id: 0 } },
    ]);

    const response = {
      success: true,
      platform: {
        totalUsers, totalRecruiters, totalCandidates, totalAdmins,
        totalJobs, openJobs, closedJobs,
        totalApplications, totalInterviews, totalOffers, totalCompanies,
      },
      topCompanies,
      topTechs,
      registrationTrend,
    };

    cache.set(cacheKey, response, 120); // cache 2 min
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/advanced/users — List users with filters
// ══════════════════════════════════════════════════════════════════════════════
router.get('/users', async (req, res) => {
  const { role, search, page = 1, limit = 25 } = req.query;
  try {
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { userId: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password -resetPasswordToken -emailVerificationToken')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, users, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/advanced/users/:userId/suspend — Suspend a user
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/users/:userId/suspend', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isActive = false;
    await user.save();

    res.json({ success: true, message: `User ${user.name} has been suspended.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/advanced/users/:userId/activate — Re-activate a user
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/users/:userId/activate', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isActive = true;
    await user.save();

    res.json({ success: true, message: `User ${user.name} has been activated.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/advanced/users/:userId/verify — Verify a recruiter
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/users/:userId/verify', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isEmailVerified = true;
    await user.save();

    res.json({ success: true, message: `User ${user.name} has been verified.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/advanced/users/:userId/role — Change user role
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/users/:userId/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'recruiter', 'admin'].includes(role))
    return res.status(400).json({ success: false, message: 'Invalid role.' });

  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.role = role;
    await user.save();

    res.json({ success: true, message: `Role updated to ${role}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/advanced/jobs/:id — Delete a fake/reported job
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    await job.deleteOne();
    cache.invalidatePrefix('jobs:');
    res.json({ success: true, message: 'Job deleted by admin.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/advanced/announcements — Create platform announcement
// ══════════════════════════════════════════════════════════════════════════════
router.post('/announcements', async (req, res) => {
  const { title, message, audience } = req.body;
  if (!title || !message)
    return res.status(400).json({ success: false, message: 'Title and message are required.' });

  try {
    // Create notification for all users (or specific audience)
    const targetAudience = audience || 'all';
    const filter = targetAudience === 'all' ? {} : { role: targetAudience };
    const users = await User.find(filter).select('userId').lean();

    const notifications = users.map(u => ({
      userId: u.userId,
      audience: targetAudience,
      type: 'announcement',
      title,
      message,
      icon: 'megaphone',
    }));

    await Notification.insertMany(notifications);
    res.json({ success: true, message: `Announcement sent to ${users.length} users.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/advanced/companies/:id/approve — Approve a company
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/companies/:id/approve', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    company.hiringStatus = 'Hiring';
    await company.save();
    cache.invalidatePrefix('companies:');

    res.json({ success: true, message: `Company "${company.name}" approved.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
