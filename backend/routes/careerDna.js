/**
 * /api/career-dna — AI-Powered Career DNA Engine
 * Dynamic professional identity, multi-dimensional scoring, career simulation.
 */
import express from 'express';
import CareerDna from '../models/careerDna/CareerDna.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
import aiService from '../services/aiService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ GET CAREER DNA ══════════

router.get('/', async (req, res) => {
  try {
    let dna = await CareerDna.findOne({ userId: req.user.userId }).lean();
    if (!dna) {
      // Auto-generate initial DNA
      dna = await CareerDna.create({ userId: req.user.userId });
      dna = dna.toObject();
    }
    res.json({ success: true, careerDna: dna });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ RECALCULATE DNA ══════════

router.post('/update', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('skills experienceYears education projects linkedin github').lean();
    const matches = await Match.find({ userId: req.user.userId }).lean();

    // Calculate dimension scores (simplified scoring engine)
    const skillCount = user?.skills?.length || 0;
    const technical = Math.min(100, skillCount * 8);
    const projectCount = user?.projects?.length || 0;
    const project = Math.min(100, projectCount * 15);
    const experience = Math.min(100, (user?.experienceYears || 0) * 12);
    const learning = Math.min(100, matches.length * 3); // rough: engagement proxy
    const assessment = req.body.assessment || 0;
    const communication = req.body.communication || 50;
    const leadership = req.body.leadership || 0;
    const innovation = req.body.innovation || (projectCount > 3 ? 60 : projectCount * 15);
    const collaboration = req.body.collaboration || 50;

    const overallScore = Math.round((technical * 0.25 + learning * 0.15 + project * 0.15 + experience * 0.15 + communication * 0.1 + leadership * 0.05 + innovation * 0.05 + assessment * 0.05 + collaboration * 0.05));
    const careerReadiness = Math.round((technical + experience + project) / 3);
    const growthPotential = Math.round((learning + innovation + collaboration) / 3);

    const dna = await CareerDna.findOneAndUpdate(
      { userId: req.user.userId },
      {
        userId: req.user.userId, overallScore, careerReadiness, growthPotential,
        technical, learning, assessment, project, experience, communication, leadership, innovation, collaboration,
        lastCalculatedAt: new Date(),
        $push: { history: { date: new Date(), score: overallScore } },
        goals: req.body.goals || undefined,
        personality: req.body.personality || undefined,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, careerDna: dna });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ AI INSIGHTS ══════════

router.get('/insights', async (req, res) => {
  try {
    const dna = await CareerDna.findOne({ userId: req.user.userId }).lean();
    if (!dna) return res.json({ success: true, insights: [] });

    const insights = [];
    if (dna.technical < 50) insights.push('Focus on building technical skills — aim for 3+ projects.');
    if (dna.learning > 80) insights.push('Excellent learning consistency! Your dedication shows.');
    if (dna.leadership < 30) insights.push('Consider mentoring or leading a project to build leadership DNA.');
    if (dna.overallScore > 85) insights.push('Your Career DNA is strong! You are highly competitive.');
    if (dna.growthPotential > 80) insights.push('High growth potential detected — keep learning emerging skills.');

    await CareerDna.findOneAndUpdate({ userId: req.user.userId }, { aiInsights: insights });
    res.json({ success: true, insights });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ CAREER READINESS ══════════

router.get('/readiness', async (req, res) => {
  try {
    const dna = await CareerDna.findOne({ userId: req.user.userId }).lean();
    const readiness = [
      { role: 'Frontend Developer', percent: Math.min(100, (dna?.technical || 0) + 10) },
      { role: 'Backend Developer', percent: Math.min(100, (dna?.technical || 0)) },
      { role: 'Full Stack Developer', percent: Math.min(100, Math.round(((dna?.technical || 0) + (dna?.project || 0)) / 2)) },
      { role: 'Tech Lead', percent: Math.min(100, Math.round(((dna?.leadership || 0) + (dna?.experience || 0)) / 2)) },
      { role: 'AI Engineer', percent: Math.min(100, Math.round((dna?.innovation || 0) * 0.8)) },
    ];
    res.json({ success: true, readiness });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SALARY INSIGHTS ══════════

router.get('/salary', async (req, res) => {
  try {
    const dna = await CareerDna.findOne({ userId: req.user.userId }).lean();
    const base = ((dna?.experience || 0) / 100) * 25 + ((dna?.technical || 0) / 100) * 15;
    const salary = {
      estimatedCurrent: Math.round(base) + ' LPA (approx)',
      estimatedMax: Math.round(base * 1.5) + ' LPA',
      fiveYearProjection: Math.round(base * 2.2) + ' LPA',
      marketPosition: base > 20 ? 'top' : base > 12 ? 'above' : base > 6 ? 'average' : 'below',
      confidence: 'medium',
    };
    res.json({ success: true, salary });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ RECOMMENDATIONS ══════════

router.get('/recommendations', async (req, res) => {
  try {
    const dna = await CareerDna.findOne({ userId: req.user.userId }).lean();
    const recs = [];
    if ((dna?.technical || 0) < 70) recs.push({ type: 'learning', text: 'Complete 2 more technical projects to boost Technical DNA.' });
    if ((dna?.leadership || 0) < 40) recs.push({ type: 'activity', text: 'Mentor a junior developer or lead a team project.' });
    if ((dna?.learning || 0) < 60) recs.push({ type: 'learning', text: 'Maintain a daily learning streak for 30 days.' });
    if ((dna?.innovation || 0) < 50) recs.push({ type: 'project', text: 'Participate in a hackathon or build an open-source tool.' });
    recs.push({ type: 'career', text: 'Update your career goals to get personalized AI coaching.' });
    res.json({ success: true, recommendations: recs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ CAREER SIMULATION ══════════

router.post('/simulate', async (req, res) => {
  const { targetRole, additionalSkills } = req.body;
  try {
    const dna = await CareerDna.findOne({ userId: req.user.userId }).lean();
    const currentScore = dna?.overallScore || 0;
    const boost = (additionalSkills?.length || 0) * 5;
    const projectedScore = Math.min(100, currentScore + boost);
    const timeline = `${Math.max(3, Math.round((100 - currentScore) / 5))} months`;
    res.json({ success: true, simulation: { currentScore, projectedScore, targetRole: targetRole || 'Next Level', additionalSkills, estimatedTimeline: timeline, scoreIncrease: projectedScore - currentScore } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ HISTORY ══════════

router.get('/history', async (req, res) => {
  try {
    const dna = await CareerDna.findOne({ userId: req.user.userId }).select('history').lean();
    res.json({ success: true, history: dna?.history || [] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SHARE ══════════

router.post('/share', async (req, res) => {
  try {
    const { visibility } = req.body;
    await CareerDna.findOneAndUpdate({ userId: req.user.userId }, { 'privacy.visibility': visibility || 'recruiters' });
    res.json({ success: true, message: 'Privacy updated.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ REPORT (recruiter view) ══════════

router.get('/report/:userId', async (req, res) => {
  try {
    const dna = await CareerDna.findOne({ userId: req.params.userId }).lean();
    if (!dna) return res.status(404).json({ success: false, message: 'Career DNA not found.' });
    if (dna.privacy?.visibility === 'private') return res.status(403).json({ success: false, message: 'Profile is private.' });
    // Mask fields based on privacy
    if (!dna.privacy?.showSalary) dna.salary = undefined;
    if (!dna.privacy?.showPersonality) dna.personality = undefined;
    res.json({ success: true, careerDna: dna });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
