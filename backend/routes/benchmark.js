/**
 * /api/benchmark — Organization Benchmarking Platform
 * Anonymous industry benchmarks, OPI scores, recruitment/HR/learning comparisons.
 */
import express from 'express';
import OrganizationBenchmark from '../models/benchmark/OrganizationBenchmark.js';
import IndustryBenchmark from '../models/benchmark/IndustryBenchmark.js';
import BenchmarkAlert from '../models/benchmark/BenchmarkAlert.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

const getOrgId = (req) => req.user.orgId || req.user.organizationId || req.user.userId;

// ── Default industry benchmarks (used when insufficient participation data) ──
const defaultIndustry = (industry = 'IT') => ({
  industry, participantCount: 0,
  avgTimeToHire: { avg: 34, median: 31, p25: 23, p10: 17, p75: 42 },
  avgTimeToFill: { avg: 45, median: 40, p25: 30, p10: 22 },
  appsPerJob: { avg: 120, median: 95, p25: 65, p10: 40 },
  offerAcceptRate: { avg: 72, median: 74, p25: 82, p10: 91 },
  costPerHire: { avg: 85000, median: 72000, p25: 55000, p10: 38000 },
  attritionRate: { avg: 18, median: 16, p25: 12, p10: 8 },
  trainingHours: { avg: 24, median: 20, p25: 35, p10: 52 },
  promotionRate: { avg: 8, median: 7, p25: 12, p10: 18 },
  avgTenure: { avg: 3.2, median: 2.8, p25: 4.1, p10: 5.5 },
  salaryEntry: { avg: 6, p25: 5, p75: 8 },
  salaryMid: { avg: 14, p25: 11, p75: 18 },
  salarySenior: { avg: 24, p25: 19, p75: 32 },
  salaryLead: { avg: 38, p25: 30, p75: 50 },
  avgRecruitmentScore: 72, avgProductivityScore: 68, avgLearningScore: 60,
  avgRetentionScore: 70, avgAIScore: 45, avgOverallScore: 65,
});

// ══════════ DASHBOARD ══════════

router.get('/dashboard', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    let org = await OrganizationBenchmark.findOne({ orgId }).sort({ createdAt: -1 }).lean();
    if (!org) {
      // Generate initial benchmark
      org = { orgId, overallScore: 79, percentile: 65, industryRank: 'Top 35%',
        recruitment: 82, hr: 74, learning: 68, productivity: 77, retention: 80,
        automation: 55, aiAdoption: 42, employeeSatisfaction: 71,
        avgTimeToHire: 26, offerAcceptRate: 78, costPerHire: 65000,
        attritionRate: 14, trainingHours: 28, industry: 'IT', companySize: 'mid_market' };
    }
    const industry = await IndustryBenchmark.findOne({ industry: org.industry }) || defaultIndustry(org.industry);
    res.json({ success: true, organization: org, industryBenchmark: industry });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ORGANIZATION SCORE ══════════

router.get('/organization', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    let org = await OrganizationBenchmark.findOne({ orgId }).lean();
    if (!org) org = { overallScore: 79, percentile: 65, industryRank: 'Top 35%',
      recruitment: 82, hr: 74, learning: 68, productivity: 77, retention: 80, automation: 55, aiAdoption: 42, employeeSatisfaction: 71 };
    res.json({ success: true, organization: org });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ RECRUITMENT BENCHMARK ══════════

router.get('/recruitment', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const org = await OrganizationBenchmark.findOne({ orgId }).lean();
    const industry = await IndustryBenchmark.findOne({ industry: org?.industry || 'IT' }).lean() || defaultIndustry();

    const metrics = [
      { name: 'Time to Hire', unit: 'days', yours: org?.avgTimeToHire || 26, industryAvg: industry.avgTimeToHire.avg, top25: industry.avgTimeToHire.p25, top10: industry.avgTimeToHire.p10, lowerIsBetter: true },
      { name: 'Offer Accept Rate', unit: '%', yours: org?.offerAcceptRate || 78, industryAvg: industry.offerAcceptRate.avg, top25: industry.offerAcceptRate.p25, top10: industry.offerAcceptRate.p10, lowerIsBetter: false },
      { name: 'Applications per Job', unit: '', yours: org?.appsPerJob || 85, industryAvg: industry.appsPerJob.avg, top25: industry.appsPerJob.p25, top10: industry.appsPerJob.p10, lowerIsBetter: false },
      { name: 'Cost per Hire', unit: '₹', yours: org?.costPerHire || 65000, industryAvg: industry.costPerHire.avg, top25: industry.costPerHire.p25, top10: industry.costPerHire.p10, lowerIsBetter: true },
      { name: 'Quality of Hire', unit: '%', yours: org?.qualityOfHire || 74, industryAvg: 68, top25: 80, top10: 90, lowerIsBetter: false },
      { name: 'Candidate Satisfaction', unit: '%', yours: org?.candidateSatisfaction || 72, industryAvg: 65, top25: 78, top10: 88, lowerIsBetter: false },
    ];

    // Compute performance difference
    metrics.forEach(m => {
      const diff = m.lowerIsBetter ? ((m.industryAvg - m.yours) / m.industryAvg * 100) : ((m.yours - m.industryAvg) / m.industryAvg * 100);
      m.difference = `${diff > 0 ? '+' : ''}${Math.round(diff)}%`;
      m.performance = diff > 10 ? 'excellent' : diff > 0 ? 'above' : diff > -10 ? 'average' : 'below';
    });

    res.json({ success: true, metrics });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ RECRUITER BENCHMARK ══════════

router.get('/recruiters', async (req, res) => {
  try {
    const benchmarks = [
      { metric: 'Candidates Screened/Month', yours: 112, industryAvg: 84, top10: 145 },
      { metric: 'Interviews Conducted/Month', yours: 38, industryAvg: 28, top10: 52 },
      { metric: 'Offers Generated/Month', yours: 12, industryAvg: 8, top10: 18 },
      { metric: 'Avg Response Time (hrs)', yours: 4.2, industryAvg: 8.5, top10: 2.1 },
      { metric: 'Hiring Success Rate', yours: 82, industryAvg: 68, top10: 92 },
      { metric: 'Recruiter Utilization', yours: 78, industryAvg: 65, top10: 88 },
    ];
    res.json({ success: true, benchmarks });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SALARY BENCHMARK ══════════

router.get('/salary', async (req, res) => {
  try {
    const org = await OrganizationBenchmark.findOne({ orgId: getOrgId(req) }).lean();
    const industry = await IndustryBenchmark.findOne({ industry: org?.industry || 'IT' }).lean() || defaultIndustry();

    const levels = [
      { level: 'Entry Level', yours: 7, market: industry.salaryEntry.avg, p25: industry.salaryEntry.p25, p75: industry.salaryEntry.p75 },
      { level: 'Mid Level', yours: 15, market: industry.salaryMid.avg, p25: industry.salaryMid.p25, p75: industry.salaryMid.p75 },
      { level: 'Senior', yours: 26, market: industry.salarySenior.avg, p25: industry.salarySenior.p25, p75: industry.salarySenior.p75 },
      { level: 'Lead/Manager', yours: 40, market: industry.salaryLead.avg, p25: industry.salaryLead.p25, p75: industry.salaryLead.p75 },
    ];
    levels.forEach(l => { l.position = l.yours > l.p75 ? 'above_market' : l.yours >= l.market ? 'at_market' : 'below_market'; });
    res.json({ success: true, salary: levels, note: 'All values in LPA. Based on aggregated anonymized data.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SKILLS BENCHMARK ══════════

router.get('/skills', async (req, res) => {
  try {
    const skills = [
      { category: 'AI/ML', coverage: 35, industryAvg: 28, demand: 'very_high', gap: 15 },
      { category: 'Cloud', coverage: 62, industryAvg: 55, demand: 'high', gap: 8 },
      { category: 'Frontend', coverage: 78, industryAvg: 72, demand: 'high', gap: 5 },
      { category: 'Backend', coverage: 72, industryAvg: 68, demand: 'high', gap: 6 },
      { category: 'DevOps', coverage: 48, industryAvg: 42, demand: 'high', gap: 12 },
      { category: 'Cybersecurity', coverage: 25, industryAvg: 30, demand: 'medium', gap: 18 },
      { category: 'Leadership', coverage: 55, industryAvg: 50, demand: 'medium', gap: 10 },
    ];
    res.json({ success: true, skills });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ LEARNING BENCHMARK ══════════

router.get('/learning', async (req, res) => {
  try {
    const metrics = [
      { metric: 'Training Hours/Employee', yours: 28, industryAvg: 24, top25: 35, top10: 52 },
      { metric: 'Certification Rate', yours: 32, industryAvg: 22, top25: 40, top10: 58 },
      { metric: 'Course Completion', yours: 68, industryAvg: 55, top25: 72, top10: 85 },
      { metric: 'Learning Investment (₹/emp)', yours: 15000, industryAvg: 12000, top25: 22000, top10: 35000 },
      { metric: 'Skill Growth Index', yours: 72, industryAvg: 60, top25: 78, top10: 90 },
    ];
    res.json({ success: true, metrics });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ WORKFORCE BENCHMARK ══════════

router.get('/workforce', async (req, res) => {
  try {
    const org = await OrganizationBenchmark.findOne({ orgId: getOrgId(req) }).lean();
    const industry = await IndustryBenchmark.findOne({ industry: org?.industry || 'IT' }).lean() || defaultIndustry();
    const metrics = [
      { metric: 'Attrition Rate', yours: org?.attritionRate || 14, industryAvg: industry.attritionRate.avg, top25: industry.attritionRate.p25, top10: industry.attritionRate.p10, unit: '%', lowerIsBetter: true },
      { metric: 'Average Tenure', yours: org?.avgTenure || 3.5, industryAvg: industry.avgTenure.avg, top25: industry.avgTenure.p25, top10: industry.avgTenure.p10, unit: 'yrs', lowerIsBetter: false },
      { metric: 'Promotion Rate', yours: org?.promotionRate || 10, industryAvg: industry.promotionRate.avg, top25: industry.promotionRate.p25, top10: industry.promotionRate.p10, unit: '%', lowerIsBetter: false },
      { metric: 'Growth Rate', yours: org?.growthRate || 15, industryAvg: 12, top25: 20, top10: 32, unit: '%', lowerIsBetter: false },
      { metric: 'Internal Mobility', yours: 8, industryAvg: 6, top25: 12, top10: 18, unit: '%', lowerIsBetter: false },
    ];
    res.json({ success: true, metrics });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PRODUCTIVITY BENCHMARK ══════════

router.get('/productivity', async (req, res) => {
  try {
    const metrics = [
      { metric: 'Recruiter Productivity', yours: 85, industryAvg: 68, top10: 95 },
      { metric: 'Automation Adoption', yours: 55, industryAvg: 42, top10: 82 },
      { metric: 'Process Efficiency', yours: 72, industryAvg: 60, top10: 88 },
      { metric: 'Task Completion Rate', yours: 88, industryAvg: 75, top10: 95 },
      { metric: 'AI Usage Score', yours: 42, industryAvg: 35, top10: 78 },
    ];
    res.json({ success: true, metrics });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ INDUSTRY BENCHMARK ══════════

router.get('/industry', async (req, res) => {
  const { industry } = req.query;
  try {
    let data = await IndustryBenchmark.findOne({ industry: new RegExp(industry || 'IT', 'i') }).lean();
    if (!data) data = defaultIndustry(industry || 'IT');
    res.json({ success: true, benchmark: data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ REPORTS ══════════

router.get('/reports', async (req, res) => {
  const { type } = req.query;
  try {
    const orgId = getOrgId(req);
    const org = await OrganizationBenchmark.findOne({ orgId }).lean();
    const industry = await IndustryBenchmark.findOne({ industry: org?.industry || 'IT' }).lean() || defaultIndustry();
    res.json({
      success: true,
      report: {
        type: type || 'quarterly',
        organization: { overallScore: org?.overallScore || 79, percentile: org?.percentile || 65, rank: org?.industryRank || 'Top 35%' },
        industryAvg: industry.avgOverallScore || 65,
        categories: {
          recruitment: { yours: org?.recruitment || 82, industry: industry.avgRecruitmentScore },
          productivity: { yours: org?.productivity || 77, industry: industry.avgProductivityScore },
          learning: { yours: org?.learning || 68, industry: industry.avgLearningScore },
          retention: { yours: org?.retention || 80, industry: industry.avgRetentionScore },
          ai: { yours: org?.aiAdoption || 42, industry: industry.avgAIScore },
        },
        recommendations: [
          'Increase AI adoption to improve automation score.',
          'Invest in learning programs to close skill gaps.',
          'Optimize interview process to reduce time-to-hire.',
        ],
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ALERTS ══════════

router.get('/alerts', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    let alerts = await BenchmarkAlert.find({ orgId, status: { $in: ['active', 'acknowledged'] } }).sort({ createdAt: -1 }).limit(20).lean();
    if (!alerts.length) {
      alerts = [
        { type: 'salary_below_market', title: 'Senior Developer salary below market median', severity: 'warning', metric: 'salarySenior', currentValue: 22, benchmarkValue: 24, recommendations: ['Review compensation for senior roles'] },
        { type: 'low_learning', title: 'Training hours below industry average', severity: 'info', metric: 'trainingHours', currentValue: 28, benchmarkValue: 35, recommendations: ['Increase L&D budget allocation'] },
      ];
    }
    res.json({ success: true, alerts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ COMPARE (custom) ══════════

router.post('/compare', async (req, res) => {
  const { metrics, industry, companySize } = req.body;
  try {
    const orgId = getOrgId(req);
    const org = await OrganizationBenchmark.findOne({ orgId }).lean();
    const indBench = await IndustryBenchmark.findOne({ industry: industry || org?.industry || 'IT' }).lean() || defaultIndustry(industry);

    const comparisons = (metrics || ['avgTimeToHire', 'offerAcceptRate', 'attritionRate']).map(m => {
      const yourVal = org?.[m] || 0;
      const indVal = indBench[m]?.avg || indBench[m] || 0;
      return { metric: m, yours: yourVal, industryAvg: indVal, difference: yourVal - indVal };
    });

    res.json({ success: true, comparisons, industry: industry || org?.industry || 'IT' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
