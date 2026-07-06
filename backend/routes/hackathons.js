/**
 * /api/hackathons — Hackathon & Innovation Hub
 * Competition platform, team management, submissions, leaderboard, certificates.
 */
import express from 'express';
import crypto from 'crypto';
import Hackathon from '../models/hackathon/Hackathon.js';
import HackathonTeam from '../models/hackathon/HackathonTeam.js';
import HackathonSubmission from '../models/hackathon/HackathonSubmission.js';
import HackathonCertificate from '../models/hackathon/HackathonCertificate.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ══════════ PUBLIC: LIST & GET ══════════

router.get('/', async (req, res) => {
  const { status, type, category, limit } = req.query;
  try {
    const filter = {};
    if (status) filter.status = status;
    else filter.status = { $in: ['upcoming', 'registration', 'live', 'completed'] };
    if (type) filter.type = type;
    if (category) filter.category = category;
    filter.visibility = 'public';
    const hackathons = await Hackathon.find(filter).select('-problems -scoringCriteria').sort({ startDate: -1 }).limit(parseInt(limit) || 30).lean();
    res.json({ success: true, hackathons });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id).lean();
    if (!hackathon) return res.status(404).json({ success: false, message: 'Hackathon not found.' });
    res.json({ success: true, hackathon });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ AUTH REQUIRED ══════════

router.use(authenticateToken);

// ── Create hackathon ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const hackathon = await Hackathon.create({ ...req.body, createdBy: req.user.userId, orgId: req.user.orgId || '' });
    res.status(201).json({ success: true, hackathon });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Update hackathon ─────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const hackathon = await Hackathon.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.userId }, req.body, { new: true });
    if (!hackathon) return res.status(404).json({ success: false, message: 'Not found or unauthorized.' });
    res.json({ success: true, hackathon });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Delete hackathon ─────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Hackathon.findOneAndDelete({ _id: req.params.id, createdBy: req.user.userId });
    res.json({ success: true, message: 'Hackathon deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Register (individual or team) ────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { hackathonId, teamName, members } = req.body;
  try {
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) return res.status(404).json({ success: false, message: 'Hackathon not found.' });
    if (hackathon.registrationCount >= hackathon.maxParticipants) return res.status(400).json({ success: false, message: 'Registration full.' });

    // Check duplicate
    const existing = await HackathonTeam.findOne({ hackathonId, 'members.userId': req.user.userId });
    if (existing) return res.status(400).json({ success: false, message: 'Already registered.' });

    const inviteCode = crypto.randomBytes(4).toString('hex');
    const team = await HackathonTeam.create({
      hackathonId, name: teamName || `Team-${inviteCode}`, leaderId: req.user.userId, leaderName: req.user.name || '',
      members: [{ userId: req.user.userId, name: req.user.name || '', role: 'leader' }, ...(members || [])],
      inviteCode,
    });

    await Hackathon.findByIdAndUpdate(hackathonId, { $inc: { registrationCount: 1, teamCount: 1 } });
    res.status(201).json({ success: true, team });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Join team (via invite code) ──────────────────────────────────────────────
router.post('/team/join', async (req, res) => {
  const { inviteCode } = req.body;
  try {
    const team = await HackathonTeam.findOne({ inviteCode });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found.' });
    const hackathon = await Hackathon.findById(team.hackathonId);
    if (team.members.length >= (hackathon?.teamSize?.max || 5)) return res.status(400).json({ success: false, message: 'Team is full.' });
    if (team.members.some(m => m.userId === req.user.userId)) return res.status(400).json({ success: false, message: 'Already in team.' });

    team.members.push({ userId: req.user.userId, name: req.user.name || '', role: 'member' });
    await team.save();
    res.json({ success: true, team });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── My teams ─────────────────────────────────────────────────────────────────
router.get('/my/teams', async (req, res) => {
  try {
    const teams = await HackathonTeam.find({ 'members.userId': req.user.userId }).populate('hackathonId', 'title status startDate endDate type').sort({ createdAt: -1 }).lean();
    res.json({ success: true, teams });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Submit ───────────────────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  const { hackathonId, teamId, title, description, repoUrl, demoUrl, videoUrl, techStack, sourceCode } = req.body;
  try {
    const team = await HackathonTeam.findOne({ _id: teamId, 'members.userId': req.user.userId });
    if (!team) return res.status(403).json({ success: false, message: 'Not a member of this team.' });

    const submission = await HackathonSubmission.findOneAndUpdate(
      { hackathonId, teamId },
      { hackathonId, teamId, userId: req.user.userId, title, description, repoUrl, demoUrl, videoUrl, techStack: techStack || [], sourceCode, status: 'submitted', submittedAt: new Date() },
      { upsert: true, new: true }
    );

    await HackathonTeam.findByIdAndUpdate(teamId, { status: 'submitted', submissionId: submission._id });
    await Hackathon.findByIdAndUpdate(hackathonId, { $inc: { submissionCount: 1 } });
    res.json({ success: true, submission });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── My submissions ───────────────────────────────────────────────────────────
router.get('/my/submissions', async (req, res) => {
  try {
    const teams = await HackathonTeam.find({ 'members.userId': req.user.userId }).select('_id').lean();
    const teamIds = teams.map(t => t._id);
    const submissions = await HackathonSubmission.find({ teamId: { $in: teamIds } }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, submissions });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Leaderboard ──────────────────────────────────────────────────────────────
router.get('/leaderboard/:hackathonId', async (req, res) => {
  try {
    const submissions = await HackathonSubmission.find({ hackathonId: req.params.hackathonId, status: { $in: ['evaluated', 'winner'] } })
      .sort({ totalScore: -1 }).limit(100).lean();
    const teams = await HackathonTeam.find({ hackathonId: req.params.hackathonId }).select('name members totalScore rank').lean();
    const teamMap = {};
    teams.forEach(t => { teamMap[t._id.toString()] = t; });

    const leaderboard = submissions.map((s, i) => ({
      rank: i + 1, teamId: s.teamId, teamName: teamMap[s.teamId?.toString()]?.name || 'Unknown',
      title: s.title, totalScore: s.totalScore, techStack: s.techStack, status: s.status,
    }));

    // Fallback: if no evaluated submissions, show teams by registration
    if (!leaderboard.length) {
      const ranked = teams.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)).map((t, i) => ({
        rank: i + 1, teamId: t._id, teamName: t.name, totalScore: t.totalScore || 0, members: t.members?.length || 0,
      }));
      return res.json({ success: true, leaderboard: ranked });
    }

    res.json({ success: true, leaderboard });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Certificates ─────────────────────────────────────────────────────────────
router.get('/certificates', async (req, res) => {
  try {
    const certs = await HackathonCertificate.find({ userId: req.user.userId }).sort({ issuedAt: -1 }).lean();
    res.json({ success: true, certificates: certs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Issue certificate (organizer) ────────────────────────────────────────────
router.post('/certificates/issue', async (req, res) => {
  const { hackathonId, userId, userName, teamName, type, title, rank, score } = req.body;
  try {
    const certId = `TINCLO-HACK-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const cert = await HackathonCertificate.create({
      hackathonId, userId, userName, teamName, type: type || 'participation',
      title: title || 'Certificate of Participation', rank, score,
      certificateId: certId, verificationUrl: `/verify/cert/${certId}`,
      issuerName: req.user.name || '', issuerOrg: req.user.orgId || '',
    });
    res.status(201).json({ success: true, certificate: cert });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics/:hackathonId', async (req, res) => {
  try {
    const h = await Hackathon.findById(req.params.hackathonId).lean();
    if (!h) return res.status(404).json({ success: false, message: 'Not found.' });
    const teams = await HackathonTeam.countDocuments({ hackathonId: req.params.hackathonId });
    const submissions = await HackathonSubmission.countDocuments({ hackathonId: req.params.hackathonId });
    const evaluated = await HackathonSubmission.countDocuments({ hackathonId: req.params.hackathonId, status: 'evaluated' });
    res.json({
      success: true, analytics: {
        title: h.title, registrations: h.registrationCount, teams, submissions, evaluated,
        submissionRate: teams ? Math.round((submissions / teams) * 100) : 0,
        completionRate: submissions ? Math.round((evaluated / submissions) * 100) : 0,
        type: h.type, status: h.status,
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Invite to interview (recruiter) ──────────────────────────────────────────
router.post('/invite', async (req, res) => {
  const { hackathonId, userId, message } = req.body;
  try {
    // In production this would create an interview invitation
    res.json({ success: true, message: 'Interview invitation sent.', invited: { hackathonId, userId, message, invitedBy: req.user.userId } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
