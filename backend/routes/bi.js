/**
 * /api/bi — Business Intelligence & Data Analytics
 * Executive dashboards, KPIs, funnels, predictions, heat maps, scheduled reports.
 */
import express from 'express';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import KpiMetric from '../models/bi/KpiMetric.js';
import ReportSchedule from '../models/bi/ReportSchedule.js';
import ForecastReport from '../models/bi/ForecastReport.js';
import DashboardLayout from '../models/bi/DashboardLayout.js';
import { authenticateToken } from '../middleware/auth.js';
import cache from '../utils/cache.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// 1. EXECUTIVE DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/executive', async (req, res) => {
  try {
    const ck = `bi:executive:${req.user.userId}`;
    const cached = cache.get(ck);
    if (cached) return res.json(cached);

    const [totalJobs, activeJobs, totalApps, totalInterviews, totalOffers, totalUsers, totalOrgs] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      Match.countDocuments({ applied: true }),
      Match.countDocuments({ applicationStatus: 'interview_scheduled' }),
      Match.countDocuments({ applicationStatus: 'offer' }),
      User.countDocuments(),
      Organization.countDocuments(),
    ]);
    const accepted = await Match.countDocuments({ applicationStatus: 'offer' });
    const result = {
      success: true, dashboard: {
        totalJobs, activeJobs, totalApplications: totalApps,
        interviews: totalInterviews, offers: totalOffers, offersAccepted: accepted,
        users: totalUsers, organizations: totalOrgs,
        offerAcceptanceRate: totalOffers > 0 ? Math.round((accepted / totalOffers) * 100) : 0,
      },
    };
    cache.set(ck, result, 120);
    res.json(result);
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. KPIs
// ══════════════════════════════════════════════════════════════════════════════

router.get('/kpis', async (req, res) => {
  const { orgId, period, periodType } = req.query;
  try {
    const filter = {};
    if (orgId) filter.organizationId = orgId;
    if (period) filter.period = period;
    if (periodType) filter.periodType = periodType;
    const kpis = await KpiMetric.find(filter).sort({ period: -1 }).limit(12).lean();
    res.json({ success: true, kpis });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. HIRING FUNNEL
// ══════════════════════════════════════════════════════════════════════════════

router.get('/funnel', async (req, res) => {
  try {
    const stages = ['saved', 'applied', 'under_review', 'interview_scheduled', 'offer'];
    const funnel = await Promise.all(stages.map(async stage => {
      const count = await Match.countDocuments({ applicationStatus: stage });
      return { stage, count };
    }));
    const total = funnel[0]?.count || 1;
    const enriched = funnel.map((f, i) => ({
      ...f, percent: Math.round((f.count / total) * 100),
      dropOff: i > 0 ? Math.round(((funnel[i - 1].count - f.count) / (funnel[i - 1].count || 1)) * 100) : 0,
    }));
    res.json({ success: true, funnel: enriched });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. SKILLS DEMAND
// ══════════════════════════════════════════════════════════════════════════════

router.get('/skills-demand', async (req, res) => {
  try {
    const skills = await Job.aggregate([
      { $match: { status: 'open' } },
      { $unwind: '$skillsRequired' },
      { $group: { _id: { $toLower: '$skillsRequired' }, demand: { $sum: 1 } } },
      { $sort: { demand: -1 } },
      { $limit: 25 },
      { $project: { skill: '$_id', demand: 1, _id: 0 } },
    ]);
    res.json({ success: true, skills });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. SALARY INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

router.get('/salary', async (req, res) => {
  const { location, domain } = req.query;
  try {
    const filter = { status: 'open', salary: { $ne: 'Salary not disclosed' } };
    if (location) filter.location = new RegExp(location, 'i');
    if (domain) filter.domain = new RegExp(domain, 'i');
    const jobs = await Job.find(filter).select('salary domain location company').limit(200).lean();
    // Extract numeric salaries where possible
    const salaries = jobs.map(j => {
      const match = j.salary?.match(/(\d+)/);
      return match ? { value: parseInt(match[1]), domain: j.domain, location: j.location } : null;
    }).filter(Boolean);
    const values = salaries.map(s => s.value).sort((a, b) => a - b);
    const avg = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
    res.json({ success: true, salary: { count: values.length, avg, min: values[0] || 0, max: values[values.length - 1] || 0, median: values[Math.floor(values.length / 2)] || 0 } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. GEOGRAPHIC ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/geographic', async (req, res) => {
  try {
    const byLocation = await Job.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
      { $project: { location: '$_id', count: 1, _id: 0 } },
    ]);
    res.json({ success: true, geographic: byLocation });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. HIRING TRENDS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/trends', async (req, res) => {
  try {
    const sixMonths = new Date(); sixMonths.setMonth(sixMonths.getMonth() - 6);
    const trends = await Job.aggregate([
      { $match: { createdAt: { $gte: sixMonths } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, jobs: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', jobs: 1, _id: 0 } },
    ]);
    res.json({ success: true, trends });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. FORECASTS & PREDICTIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/forecasts', async (req, res) => {
  const { orgId, type } = req.query;
  try {
    const filter = {};
    if (orgId) filter.organizationId = orgId;
    if (type) filter.type = type;
    const forecasts = await ForecastReport.find(filter).sort({ generatedAt: -1 }).limit(10).lean();
    res.json({ success: true, forecasts });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/forecasts/generate', async (req, res) => {
  try {
    // Simple rule-based forecast: project next 3 months based on last 3
    const threeMonths = new Date(); threeMonths.setMonth(threeMonths.getMonth() - 3);
    const recent = await Job.countDocuments({ createdAt: { $gte: threeMonths } });
    const monthlyAvg = Math.round(recent / 3);
    const predictions = [1, 2, 3].map(i => {
      const d = new Date(); d.setMonth(d.getMonth() + i);
      return { month: d.toISOString().slice(0, 7), predictedJobs: monthlyAvg + Math.round(monthlyAvg * 0.1 * i), confidence: 75 - (i * 5) };
    });
    const forecast = await ForecastReport.create({ type: req.body.type || 'hiring_growth', predictions, confidence: 70, generatedBy: req.user.userId, organizationId: req.body.orgId || null });
    res.json({ success: true, forecast });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. CUSTOM DASHBOARDS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboards', async (req, res) => {
  try {
    const dashboards = await DashboardLayout.find({ userId: req.user.userId }).lean();
    res.json({ success: true, dashboards });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/dashboards', async (req, res) => {
  try {
    const dashboard = await DashboardLayout.create({ userId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, dashboard });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/dashboards/:id', async (req, res) => {
  try {
    const dashboard = await DashboardLayout.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, req.body, { new: true });
    res.json({ success: true, dashboard });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/dashboards/:id', async (req, res) => {
  try { await DashboardLayout.deleteOne({ _id: req.params.id, userId: req.user.userId }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. SCHEDULED REPORTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/reports/scheduled', async (req, res) => {
  try {
    const reports = await ReportSchedule.find({ userId: req.user.userId }).lean();
    res.json({ success: true, reports });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/reports/scheduled', async (req, res) => {
  try {
    const report = await ReportSchedule.create({ userId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, report });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/reports/scheduled/:id', async (req, res) => {
  try { await ReportSchedule.deleteOne({ _id: req.params.id, userId: req.user.userId }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. SOURCE ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/sources', async (req, res) => {
  try {
    const sources = await Job.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { source: '$_id', count: 1, _id: 0 } },
    ]);
    res.json({ success: true, sources });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. DIVERSITY ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/diversity', async (req, res) => {
  try {
    const byLocation = await User.aggregate([
      { $match: { role: { $in: ['user', 'candidate'] }, location: { $ne: '' } } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    const byExperience = await User.aggregate([
      { $match: { role: { $in: ['user', 'candidate'] } } },
      { $bucket: { groupBy: '$experienceYears', boundaries: [0, 1, 3, 5, 8, 12, 20], default: '20+', output: { count: { $sum: 1 } } } },
    ]);
    res.json({ success: true, diversity: { byLocation, byExperience } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
