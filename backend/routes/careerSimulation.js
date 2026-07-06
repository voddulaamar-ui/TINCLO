/**
 * /api/career-simulation — AI Career Forecast Platform
 * Multi-scenario planner, salary forecasts, skill gaps, company/location recommendations.
 */
import express from 'express';
import CareerSimulation from '../models/simulation/CareerSimulation.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ RUN SIMULATION ══════════

router.post('/run', async (req, res) => {
  const { targetRoles, currentRole, preferences } = req.body;
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('skills experienceYears domain preferredLocations').lean();
    const userSkills = (user?.skills || []).map(s => s.toLowerCase());
    const expYears = user?.experienceYears || 0;

    // Generate scenarios for each target role
    const scenarios = await Promise.all((targetRoles || ['Senior Developer']).map(async role => {
      // Find jobs matching target role to determine required skills
      const jobs = await Job.find({ title: new RegExp(role, 'i'), status: 'open' }).select('skillsRequired salary location company').limit(20).lean();
      const requiredSkills = [...new Set(jobs.flatMap(j => j.skillsRequired || []))].slice(0, 15);
      const missingSkills = requiredSkills.filter(s => !userSkills.includes(s.toLowerCase()));
      const matchPercent = requiredSkills.length > 0 ? Math.round(((requiredSkills.length - missingSkills.length) / requiredSkills.length) * 100) : 50;

      // Estimate timeline based on missing skills
      const learningHours = missingSkills.length * 40;
      const months = Math.max(3, Math.round(learningHours / 80)); // ~80 hrs/month learning
      const timeline = `${months} months`;

      // Salary estimation
      const salaryValues = jobs.map(j => { const m = j.salary?.match(/(\d+)/); return m ? parseInt(m[1]) : 0; }).filter(Boolean).sort((a, b) => a - b);
      const salaryRange = salaryValues.length >= 2 ? `₹${salaryValues[0]}–${salaryValues[salaryValues.length - 1]} LPA` : 'Market rate';

      // Success probability
      const prob = matchPercent > 80 ? 'very_high' : matchPercent > 60 ? 'high' : matchPercent > 40 ? 'medium' : 'low';

      // Companies & locations
      const companies = [...new Set(jobs.map(j => j.company))].slice(0, 8);
      const locations = [...new Set(jobs.map(j => j.location))].slice(0, 6);

      // Milestones
      const milestones = missingSkills.slice(0, 5).map((skill, i) => ({
        title: `Learn ${skill}`, timeline: `Month ${(i + 1) * Math.ceil(months / 5)}`, skills: [skill],
      }));
      milestones.push({ title: `Ready for ${role}`, timeline: `Month ${months}`, skills: [] });

      return {
        targetRole: role, timeline, salaryRange, missingSkills, learningHours,
        successProbability: prob, riskLevel: missingSkills.length > 8 ? 'high' : missingSkills.length > 4 ? 'medium' : 'low',
        demandScore: Math.min(100, jobs.length * 5), companies, locations, milestones,
      };
    }));

    // Salary forecast
    const baseSalary = Math.max(4, expYears * 3);
    const salaryForecast = {
      current: `₹${baseSalary}–${baseSalary + 4} LPA`,
      oneYear: `₹${baseSalary + 2}–${baseSalary + 6} LPA`,
      threeYear: `₹${Math.round(baseSalary * 1.5)}–${Math.round(baseSalary * 2)} LPA`,
      fiveYear: `₹${Math.round(baseSalary * 2)}–${Math.round(baseSalary * 3)} LPA`,
      tenYear: `₹${Math.round(baseSalary * 3)}–${Math.round(baseSalary * 5)} LPA`,
    };

    // Risk analysis
    const riskAnalysis = {
      automationRisk: expYears > 5 ? 'low' : 'medium',
      skillObsolescence: userSkills.length > 10 ? 'low' : 'medium',
      marketCompetition: 'medium',
      mitigationPlan: ['Learn emerging technologies', 'Build leadership skills', 'Contribute to open source'],
    };

    // Alternative roles
    const alternativeRoles = ['Full Stack Developer', 'DevOps Engineer', 'Cloud Architect', 'Technical Lead', 'Product Engineer'].filter(r => !(targetRoles || []).includes(r)).slice(0, 5);

    // Future skills
    const futureSkills = ['AI Agents', 'LLMOps', 'Platform Engineering', 'Edge AI', 'Rust', 'WebAssembly'].slice(0, 6);

    const simulation = await CareerSimulation.create({
      userId: req.user.userId, currentRole: currentRole || user?.domain || '',
      currentScore: Math.round((userSkills.length / 15) * 100), currentSkills: userSkills,
      experienceYears: expYears, scenarios, salaryForecast, riskAnalysis,
      growthPotential: Math.min(100, userSkills.length * 6 + expYears * 4),
      alternativeRoles, futureSkills, status: 'completed',
    });

    res.json({ success: true, simulation });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ GET LATEST ══════════

router.get('/', async (req, res) => {
  try {
    const simulation = await CareerSimulation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, simulation });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ HISTORY ══════════

router.get('/history', async (req, res) => {
  try {
    const simulations = await CareerSimulation.find({ userId: req.user.userId }).select('-scenarios.milestones').sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, simulations });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ COMPARE SCENARIOS ══════════

router.post('/compare', async (req, res) => {
  const { simulationId, scenarioIndexes } = req.body;
  try {
    const sim = await CareerSimulation.findById(simulationId).lean();
    if (!sim) return res.status(404).json({ success: false, message: 'Simulation not found.' });
    const selected = (scenarioIndexes || [0, 1]).map(i => sim.scenarios[i]).filter(Boolean);
    res.json({ success: true, comparison: selected });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SKILLS NEEDED ══════════

router.get('/skills', async (req, res) => {
  try {
    const sim = await CareerSimulation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    if (!sim) return res.json({ success: true, skills: [] });
    const allMissing = [...new Set(sim.scenarios.flatMap(s => s.missingSkills))];
    res.json({ success: true, skills: allMissing });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SALARY FORECAST ══════════

router.get('/salary', async (req, res) => {
  try {
    const sim = await CareerSimulation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 }).select('salaryForecast').lean();
    res.json({ success: true, salary: sim?.salaryForecast || {} });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ COMPANIES ══════════

router.get('/companies', async (req, res) => {
  try {
    const sim = await CareerSimulation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    const companies = [...new Set(sim?.scenarios?.flatMap(s => s.companies) || [])];
    res.json({ success: true, companies });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ LOCATIONS ══════════

router.get('/locations', async (req, res) => {
  try {
    const sim = await CareerSimulation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    const locations = [...new Set(sim?.scenarios?.flatMap(s => s.locations) || [])];
    res.json({ success: true, locations });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ RECOMMENDATIONS ══════════

router.get('/recommendations', async (req, res) => {
  try {
    const sim = await CareerSimulation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    const recs = [];
    if (sim?.scenarios?.[0]?.successProbability === 'low') recs.push('Focus on building fundamentals before targeting this role.');
    if (sim?.futureSkills?.length) recs.push(`Emerging skills to consider: ${sim.futureSkills.slice(0, 3).join(', ')}`);
    if (sim?.alternativeRoles?.length) recs.push(`Alternative paths: ${sim.alternativeRoles.slice(0, 3).join(', ')}`);
    recs.push('Run a new simulation every quarter to track progress.');
    res.json({ success: true, recommendations: recs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ REPORT EXPORT ══════════

router.get('/report', async (req, res) => {
  try {
    const sim = await CareerSimulation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    if (!sim) return res.status(404).json({ success: false, message: 'No simulation found.' });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="career-simulation-report.json"');
    res.json(sim);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
