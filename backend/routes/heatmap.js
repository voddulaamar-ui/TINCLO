/**
 * /api/heatmap — Global Talent Intelligence Platform
 * Interactive heatmaps, skill demand, salary analytics, forecasts, alerts.
 */
import express from 'express';
import TalentHeatmap from '../models/heatmap/TalentHeatmap.js';
import SkillDemand from '../models/heatmap/SkillDemand.js';
import SalaryAnalytics from '../models/heatmap/SalaryAnalytics.js';
import MarketForecast from '../models/heatmap/MarketForecast.js';
import HeatmapAlert from '../models/heatmap/HeatmapAlert.js';
import Job from '../models/Job.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ══════════ HELPERS ══════════

const getCurrentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
};

// Generate heatmap data from live job database (aggregation fallback)
const generateLocationStats = async (filter = {}) => {
  const matchStage = { status: 'open', ...filter };
  const jobs = await Job.find(matchStage).select('location skillsRequired salary company type').limit(5000).lean();

  const cityMap = {};
  for (const job of jobs) {
    const city = job.location || 'Remote';
    if (!cityMap[city]) cityMap[city] = { city, country: 'India', totalJobs: 0, companies: new Set(), skills: {}, remoteJobs: 0, salaries: [] };
    cityMap[city].totalJobs++;
    if (job.company) cityMap[city].companies.add(job.company);
    if (job.type === 'remote') cityMap[city].remoteJobs++;
    (job.skillsRequired || []).forEach(s => { cityMap[city].skills[s] = (cityMap[city].skills[s] || 0) + 1; });
    const salMatch = job.salary?.match(/(\d+)/);
    if (salMatch) cityMap[city].salaries.push(parseInt(salMatch[1]));
  }

  return Object.values(cityMap).map(c => ({
    city: c.city, country: c.country, totalJobs: c.totalJobs,
    activeCompanies: c.companies.size, remoteJobs: c.remoteJobs,
    avgSalary: c.salaries.length ? Math.round(c.salaries.reduce((a, b) => a + b, 0) / c.salaries.length) : 0,
    topSkills: Object.entries(c.skills).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([skill, demand]) => ({ skill, demand })),
    topCompanies: [...c.companies].slice(0, 8).map(name => ({ name, openings: 0 })),
    demandLevel: c.totalJobs > 500 ? 'very_high' : c.totalJobs > 200 ? 'high' : c.totalJobs > 50 ? 'medium' : 'low',
    competitionIndex: Math.min(100, Math.round(c.totalJobs / Math.max(1, c.companies.size) * 5)),
    hiringGrowth: Math.round((Math.random() * 30) - 5), // placeholder — real system uses time comparison
  })).sort((a, b) => b.totalJobs - a.totalJobs);
};

const generateSkillStats = async (skillFilter) => {
  const query = skillFilter ? { skillsRequired: new RegExp(skillFilter, 'i'), status: 'open' } : { status: 'open' };
  const jobs = await Job.find(query).select('location skillsRequired salary company type').limit(3000).lean();

  const skillMap = {};
  for (const job of jobs) {
    for (const skill of (job.skillsRequired || [])) {
      const s = skill.toLowerCase();
      if (skillFilter && !s.includes(skillFilter.toLowerCase())) continue;
      if (!skillMap[s]) skillMap[s] = { skill, totalJobs: 0, cities: {}, companies: new Set(), salaries: [], remote: 0 };
      skillMap[s].totalJobs++;
      const city = job.location || 'Remote';
      skillMap[s].cities[city] = (skillMap[s].cities[city] || 0) + 1;
      if (job.company) skillMap[s].companies.add(job.company);
      if (job.type === 'remote') skillMap[s].remote++;
      const m = job.salary?.match(/(\d+)/);
      if (m) skillMap[s].salaries.push(parseInt(m[1]));
    }
  }

  return Object.values(skillMap).map(s => ({
    skill: s.skill, totalJobs: s.totalJobs,
    avgSalary: s.salaries.length ? Math.round(s.salaries.reduce((a, b) => a + b, 0) / s.salaries.length) : 0,
    remoteAvailability: s.totalJobs ? Math.round((s.remote / s.totalJobs) * 100) : 0,
    topCities: Object.entries(s.cities).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, jobs]) => ({ city, jobs })),
    topCompanies: [...s.companies].slice(0, 8).map(name => ({ name })),
    demandLevel: s.totalJobs > 300 ? 'very_high' : s.totalJobs > 100 ? 'high' : s.totalJobs > 30 ? 'medium' : 'low',
    competitionIndex: Math.min(100, Math.round(s.totalJobs / Math.max(1, s.companies.size) * 4)),
    trendDirection: 'rising',
  })).sort((a, b) => b.totalJobs - a.totalJobs);
};

// ══════════ PUBLIC ENDPOINTS (no auth needed for market data) ══════════

// ── Global overview ──────────────────────────────────────────────────────────
router.get('/global', async (req, res) => {
  try {
    // Try stored data first, fallback to live aggregation
    let data = await TalentHeatmap.find({ period: getCurrentPeriod() }).sort({ totalJobs: -1 }).limit(50).lean();
    if (!data.length) data = await generateLocationStats();
    const totalJobs = data.reduce((sum, d) => sum + d.totalJobs, 0);
    const totalCities = data.length;
    const avgGrowth = data.length ? Math.round(data.reduce((s, d) => s + (d.hiringGrowth || 0), 0) / data.length) : 0;
    res.json({ success: true, summary: { totalJobs, totalCities, avgGrowth, period: getCurrentPeriod() }, locations: data.slice(0, 30) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Country-level ────────────────────────────────────────────────────────────
router.get('/country', async (req, res) => {
  const { country } = req.query;
  try {
    let data = await TalentHeatmap.find({ country: new RegExp(country || 'India', 'i'), period: getCurrentPeriod() }).sort({ totalJobs: -1 }).lean();
    if (!data.length) data = await generateLocationStats();
    res.json({ success: true, locations: data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── State-level ──────────────────────────────────────────────────────────────
router.get('/state', async (req, res) => {
  const { state } = req.query;
  try {
    const filter = state ? { state: new RegExp(state, 'i') } : {};
    let data = await TalentHeatmap.find({ ...filter, period: getCurrentPeriod() }).sort({ totalJobs: -1 }).lean();
    if (!data.length) data = (await generateLocationStats()).filter(d => !state || d.city?.toLowerCase().includes(state.toLowerCase()));
    res.json({ success: true, locations: data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── City-level ───────────────────────────────────────────────────────────────
router.get('/city', async (req, res) => {
  const { city } = req.query;
  try {
    if (!city) return res.json({ success: true, location: null });
    let data = await TalentHeatmap.findOne({ city: new RegExp(city, 'i'), period: getCurrentPeriod() }).lean();
    if (!data) {
      const all = await generateLocationStats({ location: new RegExp(city, 'i') });
      data = all[0] || null;
    }
    res.json({ success: true, location: data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Skills heatmap ───────────────────────────────────────────────────────────
router.get('/skills', async (req, res) => {
  const { skill, limit } = req.query;
  try {
    let data = await SkillDemand.find(skill ? { skill: new RegExp(skill, 'i') } : {}).sort({ totalJobs: -1 }).limit(parseInt(limit) || 20).lean();
    if (!data.length) data = await generateSkillStats(skill || null);
    res.json({ success: true, skills: Array.isArray(data) ? data.slice(0, parseInt(limit) || 20) : [data] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Salary heatmap ───────────────────────────────────────────────────────────
router.get('/salary', async (req, res) => {
  const { role, city, skill } = req.query;
  try {
    const filter = {};
    if (role) filter.role = new RegExp(role, 'i');
    if (city) filter.city = new RegExp(city, 'i');
    if (skill) filter.skill = new RegExp(skill, 'i');
    let data = await SalaryAnalytics.find(filter).sort({ avgSalary: -1 }).limit(20).lean();
    if (!data.length) {
      // Generate from jobs
      const q = {};
      if (role) q.title = new RegExp(role, 'i');
      if (city) q.location = new RegExp(city, 'i');
      if (skill) q.skillsRequired = new RegExp(skill, 'i');
      q.status = 'open';
      const jobs = await Job.find(q).select('title location salary').limit(500).lean();
      const cityGroup = {};
      for (const j of jobs) {
        const loc = j.location || 'Remote';
        if (!cityGroup[loc]) cityGroup[loc] = { role: role || j.title, city: loc, salaries: [] };
        const m = j.salary?.match(/(\d+)/);
        if (m) cityGroup[loc].salaries.push(parseInt(m[1]));
      }
      data = Object.values(cityGroup).map(g => ({
        role: g.role, city: g.city,
        minSalary: g.salaries.length ? Math.min(...g.salaries) : 0,
        maxSalary: g.salaries.length ? Math.max(...g.salaries) : 0,
        avgSalary: g.salaries.length ? Math.round(g.salaries.reduce((a, b) => a + b, 0) / g.salaries.length) : 0,
        medianSalary: g.salaries.length ? g.salaries.sort((a, b) => a - b)[Math.floor(g.salaries.length / 2)] : 0,
      })).sort((a, b) => b.avgSalary - a.avgSalary);
    }
    res.json({ success: true, salary: data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Companies heatmap ────────────────────────────────────────────────────────
router.get('/companies', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open' }).select('company location skillsRequired').limit(5000).lean();
    const companyMap = {};
    for (const j of jobs) {
      const c = j.company || 'Unknown';
      if (!companyMap[c]) companyMap[c] = { name: c, openings: 0, locations: new Set(), skills: new Set() };
      companyMap[c].openings++;
      if (j.location) companyMap[c].locations.add(j.location);
      (j.skillsRequired || []).slice(0, 5).forEach(s => companyMap[c].skills.add(s));
    }
    const companies = Object.values(companyMap).map(c => ({
      name: c.name, openings: c.openings, locations: [...c.locations].slice(0, 5), topSkills: [...c.skills].slice(0, 8),
    })).sort((a, b) => b.openings - a.openings).slice(0, 30);
    res.json({ success: true, companies });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Forecast ─────────────────────────────────────────────────────────────────
router.get('/forecast', async (req, res) => {
  const { type, name } = req.query;
  try {
    let forecasts = await MarketForecast.find(type ? { type } : {}).sort({ forecastDemand: -1 }).limit(15).lean();
    if (!forecasts.length) {
      // Generate placeholder forecasts
      const topSkills = ['React', 'Python', 'AWS', 'Node.js', 'Docker', 'Kubernetes', 'AI/ML', 'TypeScript', 'Java', 'Go'];
      forecasts = topSkills.map((s, i) => ({
        type: 'skill', name: s, currentDemand: 100 - i * 8, forecastDemand: 110 - i * 6,
        growthRate: Math.round(15 - i * 1.2), confidence: i < 4 ? 'high' : 'medium',
        aiSummary: `${s} demand is expected to grow steadily over the next 12 months.`,
        recommendations: [`Invest in ${s} skills`, `Build projects using ${s}`],
      }));
    }
    if (name) forecasts = forecasts.filter(f => f.name?.toLowerCase().includes(name.toLowerCase()));
    res.json({ success: true, forecasts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Trends ───────────────────────────────────────────────────────────────────
router.get('/trends', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open' }).select('skillsRequired createdAt').limit(3000).lean();
    const skillCount = {};
    for (const j of jobs) {
      for (const s of (j.skillsRequired || [])) {
        skillCount[s] = (skillCount[s] || 0) + 1;
      }
    }
    const rising = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([skill, count]) => ({ skill, demand: count, trend: 'rising' }));
    const emerging = ['AI Agents', 'LLMOps', 'Platform Engineering', 'Edge AI', 'Rust', 'WebAssembly', 'HTMX', 'Bun'].map(s => ({ skill: s, demand: Math.floor(Math.random() * 50) + 10, trend: 'emerging' }));
    res.json({ success: true, rising, emerging });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Remote work ──────────────────────────────────────────────────────────────
router.get('/remote', async (req, res) => {
  try {
    const total = await Job.countDocuments({ status: 'open' });
    const remote = await Job.countDocuments({ status: 'open', type: 'remote' });
    const hybrid = await Job.countDocuments({ status: 'open', type: 'hybrid' });
    const office = total - remote - hybrid;
    const remoteJobs = await Job.find({ status: 'open', type: 'remote' }).select('title company location skillsRequired salary').limit(20).lean();
    res.json({ success: true, stats: { total, remote, hybrid, office, remotePercentage: total ? Math.round((remote / total) * 100) : 0 }, recentRemoteJobs: remoteJobs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ AUTH-REQUIRED ENDPOINTS ══════════

// ── Advanced filter ──────────────────────────────────────────────────────────
router.post('/filter', authenticateToken, async (req, res) => {
  const { country, state, city, skill, role, industry, experience, companySize, remote, salaryMin, salaryMax } = req.body;
  try {
    const query = { status: 'open' };
    if (city || state || country) query.location = new RegExp(city || state || country, 'i');
    if (skill) query.skillsRequired = new RegExp(skill, 'i');
    if (role) query.title = new RegExp(role, 'i');
    if (remote) query.type = 'remote';

    const jobs = await Job.find(query).select('title company location salary skillsRequired type').limit(1000).lean();

    // Aggregate
    const cityMap = {};
    for (const j of jobs) {
      const loc = j.location || 'Remote';
      if (!cityMap[loc]) cityMap[loc] = { city: loc, jobs: 0, companies: new Set(), skills: {}, salaries: [] };
      cityMap[loc].jobs++;
      if (j.company) cityMap[loc].companies.add(j.company);
      (j.skillsRequired || []).forEach(s => { cityMap[loc].skills[s] = (cityMap[loc].skills[s] || 0) + 1; });
      const m = j.salary?.match(/(\d+)/);
      if (m) cityMap[loc].salaries.push(parseInt(m[1]));
    }

    const results = Object.values(cityMap).map(c => ({
      city: c.city, totalJobs: c.jobs, activeCompanies: c.companies.size,
      avgSalary: c.salaries.length ? Math.round(c.salaries.reduce((a, b) => a + b, 0) / c.salaries.length) : 0,
      topSkills: Object.entries(c.skills).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, demand]) => ({ skill, demand })),
      demandLevel: c.jobs > 200 ? 'very_high' : c.jobs > 80 ? 'high' : c.jobs > 20 ? 'medium' : 'low',
    })).sort((a, b) => b.totalJobs - a.totalJobs);

    res.json({ success: true, results, totalMatches: jobs.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── AI Insights ──────────────────────────────────────────────────────────────
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const locations = await generateLocationStats();
    const topCities = locations.slice(0, 5).map(l => l.city);
    const topSkillsData = await generateSkillStats(null);
    const topSkills = topSkillsData.slice(0, 5).map(s => s.skill);

    const insights = [
      `Top hiring cities: ${topCities.join(', ')}`,
      `Fastest growing skills: ${topSkills.join(', ')}`,
      locations[0] ? `${locations[0].city} leads with ${locations[0].totalJobs} openings` : 'Market data is being collected.',
      `Remote jobs account for significant market share — consider remote-first roles.`,
      `AI and cloud skills continue to command premium salaries.`,
    ];
    res.json({ success: true, insights, topCities, topSkills });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Alerts CRUD ──────────────────────────────────────────────────────────────
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await HeatmapAlert.find({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, alerts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/alerts', authenticateToken, async (req, res) => {
  try {
    const alert = await HeatmapAlert.create({ userId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, alert });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/alerts/:id', authenticateToken, async (req, res) => {
  try {
    await HeatmapAlert.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ success: true, message: 'Alert deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Competition index ────────────────────────────────────────────────────────
router.get('/competition', authenticateToken, async (req, res) => {
  const { skill } = req.query;
  try {
    const query = { status: 'open' };
    if (skill) query.skillsRequired = new RegExp(skill, 'i');
    const jobCount = await Job.countDocuments(query);
    // Simple proxy: more jobs with fewer unique companies = higher competition
    const jobs = await Job.find(query).select('company').limit(2000).lean();
    const uniqueCompanies = new Set(jobs.map(j => j.company)).size;
    const index = Math.min(100, Math.round((jobCount / Math.max(1, uniqueCompanies)) * 3));
    const level = index > 70 ? 'very_high' : index > 50 ? 'high' : index > 30 ? 'medium' : 'low';
    res.json({ success: true, competition: { skill: skill || 'overall', index, level, totalJobs: jobCount, uniqueCompanies } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
