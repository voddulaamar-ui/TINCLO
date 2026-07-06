import express from 'express';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import RecentView from '../models/RecentView.js';
import CompanyFollow from '../models/CompanyFollow.js';
import { authenticateToken, requireRecruiter } from '../middleware/auth.js';
import { computeMatch } from '../services/matchingService.js';

const router = express.Router();
router.use(authenticateToken);

const profileCompletion = (user) => {
  const checks = [
    ['name', user.name],
    ['email', user.email],
    ['phone', user.phone],
    ['location', user.location],
    ['Resume', user.resumeUrl],
    ['LinkedIn', user.linkedin],
    ['Skills', user.skills?.length],
    ['Projects', user.projects?.length],
    ['Education', user.education?.length],
    ['Bio', user.bio],
  ];
  const complete = checks.filter(([, value]) => Boolean(value)).length;
  return {
    percent: Math.round((complete / checks.length) * 100),
    missing: checks.filter(([, value]) => !value).map(([label]) => label),
  };
};

router.get('/candidate', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [matches, openJobs, newJobsToday, notifications, recentViews, followingCompanies] = await Promise.all([
      Match.find({ userId: user.userId }).populate('jobId').sort({ matchedAt: -1 }).lean(),
      Job.find({ status: 'open' }).sort({ createdAt: -1 }).limit(60).lean(),
      Job.countDocuments({ status: 'open', createdAt: { $gte: today } }),
      Notification.find({ userId: user.userId }).sort({ createdAt: -1 }).limit(8).lean(),
      RecentView.find({ userId: user.userId }).populate('jobId').sort({ viewedAt: -1 }).limit(10).lean(),
      CompanyFollow.find({ userId: user.userId }).populate('companyId').sort({ createdAt: -1 }).limit(8).lean(),
    ]);
    const saved = matches.filter(m => m.applicationStatus === 'saved');
    const applied = matches.filter(m => m.applied);
    const interviews = matches.filter(m => m.applicationStatus === 'interview_scheduled');
    const recommendedJobs = openJobs
      .map(job => ({ ...job, matchScore: computeMatch(user, job).matchScore }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
    const recentActivity = [
      ...matches.slice(0, 5).map(m => ({
        type: m.applied ? 'applied' : 'saved',
        text: `${m.applied ? 'Applied to' : 'Saved'} ${m.jobId?.title || 'a job'} at ${m.jobId?.company || 'a company'}`,
        at: m.statusUpdatedAt || m.matchedAt,
      })),
      ...notifications.slice(0, 5).map(n => ({ type: n.type, text: n.title, at: n.createdAt })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
    res.json({
      user,
      stats: {
        totalMatchingJobs: openJobs.length,
        newJobsToday,
        savedJobs: saved.length,
        appliedJobs: applied.length,
        interviewsScheduled: interviews.length,
        profileCompletion: profileCompletion(user).percent,
      },
      recentActivity,
      recommendedJobs,
      upcomingInterviews: interviews.map(m => ({
        company: m.jobId?.company,
        position: m.jobId?.title,
        interviewDate: m.statusUpdatedAt,
        time: 'To be shared',
        mode: m.jobId?.workMode || 'Online',
        joinLink: '',
      })),
      profileCompletion: profileCompletion(user),
      notifications,
      recentlyViewed: recentViews.map(v => ({ ...v.jobId, viewedAt: v.viewedAt })).filter(Boolean),
      followingCompanies: followingCompanies.map(f => f.companyId).filter(Boolean),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/recruiter', requireRecruiter, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { postedBy: req.user.userId };
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();
    const jobIds = jobs.map(j => j._id);
    const matches = await Match.find({ jobId: { $in: jobIds } }).sort({ matchedAt: -1 }).lean();
    const recentApplicants = await Promise.all(matches.filter(m => m.applied).slice(0, 8).map(async m => ({
      ...m,
      user: await User.findOne({ userId: m.userId }).select('-password').lean(),
      job: jobs.find(j => String(j._id) === String(m.jobId)),
    })));
    const jobPerformance = jobs.map(job => {
      const related = matches.filter(m => String(m.jobId) === String(job._id));
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
    res.json({
      stats: {
        activeJobs: jobs.filter(j => j.status === 'open').length,
        closedJobs: jobs.filter(j => j.status === 'closed').length,
        totalApplications: matches.filter(m => m.applied).length,
        shortlistedCandidates: matches.filter(m => ['under_review', 'interview_scheduled', 'offer'].includes(m.applicationStatus)).length,
        interviewsScheduled: matches.filter(m => m.applicationStatus === 'interview_scheduled').length,
        totalViews: 0,
      },
      jobPerformance,
      recentApplicants,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
