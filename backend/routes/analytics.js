import express from 'express';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import RecentView from '../models/RecentView.js';
import { authenticateToken, requireRecruiter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

const lastNDays = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1 - i));
  return d;
});

router.get('/candidate', async (req, res) => {
  try {
    const userId = req.user.userId;
    const [matches, views, events, swipedLeftCount] = await Promise.all([
      Match.find({ userId }).populate('jobId').lean(),
      RecentView.countDocuments({ userId }),
      AnalyticsEvent.find({ userId, createdAt: { $gte: lastNDays(30)[0] } }).lean(),
      // Count all swiped_left events ever recorded for this user (not just last 30 days)
      AnalyticsEvent.countDocuments({ userId, eventType: 'swiped_left' }),
    ]);
    const statuses = matches.reduce((acc, m) => {
      acc[m.applicationStatus || 'saved'] = (acc[m.applicationStatus || 'saved'] || 0) + 1;
      return acc;
    }, {});
    const weeklyActivity = lastNDays(7).map(day => {
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      return {
        date: day.toISOString().slice(0, 10),
        count: events.filter(e => e.createdAt >= day && e.createdAt < next).length
          + matches.filter(m => m.matchedAt >= day && m.matchedAt < next).length,
      };
    });
    const monthlyActivity = lastNDays(30).map(day => {
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      return {
        date: day.toISOString().slice(0, 10),
        count: events.filter(e => e.createdAt >= day && e.createdAt < next).length,
      };
    });
    res.json({
      totals: {
        jobsViewed:   views,
        swipedRight:  matches.length,
        swipedLeft:   swipedLeftCount,
        jobsSaved:    matches.filter(m => m.applicationStatus === 'saved').length,
        jobsApplied:  matches.filter(m => m.applied).length,
        profileViews: events.filter(e => e.eventType === 'profile_viewed').length,
      },
      weeklyActivity,
      monthlyActivity,
      applicationsByStatus: statuses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/recruiter', requireRecruiter, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { postedBy: req.user.userId };
    const jobs = await Job.find(filter).lean();
    const jobIds = jobs.map(j => j._id);
    const matches = await Match.find({ jobId: { $in: jobIds } }).populate('jobId').lean();
    const applications = matches.filter(m => m.applied);
    const jobRows = jobs.map(job => {
      const related = matches.filter(m => String(m.jobId?._id || m.jobId) === String(job._id));
      return {
        jobId: job._id,
        title: job.title,
        views: 0,
        saves: related.length,
        applications: related.filter(m => m.applied).length,
        shortlisted: related.filter(m => ['under_review', 'interview_scheduled', 'offer'].includes(m.applicationStatus)).length,
        interviewed: related.filter(m => m.applicationStatus === 'interview_scheduled').length,
        selected: related.filter(m => m.applicationStatus === 'offer').length,
      };
    });
    const mostViewedJob = jobRows.slice().sort((a, b) => b.views - a.views)[0] || null;
    const mostAppliedJob = jobRows.slice().sort((a, b) => b.applications - a.applications)[0] || null;
    const skillCounts = {};
    const expCounts = {};
    await Promise.all(applications.map(async app => {
      const user = await User.findOne({ userId: app.userId }).lean();
      (user?.skills || []).forEach(skill => { skillCounts[skill] = (skillCounts[skill] || 0) + 1; });
      const exp = user?.experienceYears ? `${user.experienceYears}+ yrs` : 'Entry';
      expCounts[exp] = (expCounts[exp] || 0) + 1;
    }));
    res.json({
      totals: {
        totalJobsPosted: jobs.length,
        activeJobs: jobs.filter(j => j.status === 'open').length,
        closedJobs: jobs.filter(j => j.status === 'closed').length,
        applicationsReceived: applications.length,
        shortlistedCandidates: matches.filter(m => ['under_review', 'interview_scheduled', 'offer'].includes(m.applicationStatus)).length,
        interviewsScheduled: matches.filter(m => m.applicationStatus === 'interview_scheduled').length,
        averageApplicationsPerJob: jobs.length ? Math.round((applications.length / jobs.length) * 10) / 10 : 0,
        hiringSuccessRate: applications.length ? Math.round((matches.filter(m => m.applicationStatus === 'offer').length / applications.length) * 100) : 0,
      },
      mostViewedJob,
      mostAppliedJob,
      jobPerformance: jobRows,
      applicationsPerWeek: lastNDays(7).map(day => {
        const next = new Date(day);
        next.setDate(day.getDate() + 1);
        return { date: day.toISOString().slice(0, 10), count: applications.filter(m => m.matchedAt >= day && m.matchedAt < next).length };
      }),
      candidateSkillDistribution: Object.entries(skillCounts).map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      candidateExperienceDistribution: Object.entries(expCounts).map(([experience, count]) => ({ experience, count })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
