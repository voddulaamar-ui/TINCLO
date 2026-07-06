/**
 * /api/passport — Digital Career Passport
 * Lifelong professional identity, timeline, skills, sharing, QR, analytics.
 */
import express from 'express';
import crypto from 'crypto';
import CareerPassport from '../models/passport/CareerPassport.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ══════════ PUBLIC PROFILE ══════════

router.get('/public/:username', async (req, res) => {
  try {
    const passport = await CareerPassport.findOne({
      $or: [{ username: req.params.username }, { passportId: req.params.username }],
    }).lean();
    if (!passport) return res.status(404).json({ success: false, message: 'Passport not found.' });
    if (passport.privacy.profileVisibility === 'private') return res.status(403).json({ success: false, message: 'This profile is private.' });
    // Increment views
    await CareerPassport.findByIdAndUpdate(passport._id, { $inc: { totalViews: 1 } });
    // Mask private fields
    if (!passport.privacy.showPhone) delete passport.phone;
    if (!passport.privacy.showEmail) delete passport.email;
    if (!passport.privacy.showSalary) passport.timeline = passport.timeline?.filter(t => !t.title?.includes('salary'));
    if (!passport.privacy.showReferences) passport.references = [];
    if (!passport.privacy.showAssessments) passport.assessments = undefined;
    delete passport.shareLinks;
    res.json({ success: true, passport });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ AUTHENTICATED ROUTES ══════════

router.use(authenticateToken);

// Get my passport
router.get('/', async (req, res) => {
  try {
    let passport = await CareerPassport.findOne({ userId: req.user.userId }).lean();
    if (!passport) {
      // Auto-create passport
      const passportId = `TIN-DCP-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      passport = await CareerPassport.create({ userId: req.user.userId, passportId, fullName: req.user.name || '' });
      passport = passport.toObject();
    }
    res.json({ success: true, passport });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Update passport
router.put('/', async (req, res) => {
  try {
    const allowed = ['fullName','headline','title','photo','coverImage','location','nationality','languages','website','linkedin','github','twitter','leetcode','hackerrank','stackoverflow','skills','timeline','endorsements','references','careerDna','privacy','username'];
    const update = {};
    for (const k of allowed) { if (req.body[k] !== undefined) update[k] = req.body[k]; }
    // Calculate completion
    const fields = ['fullName','headline','photo','location','linkedin','github','website'];
    const filled = fields.filter(f => update[f] || req.body[f]).length;
    update.profileCompletion = Math.round((filled / fields.length) * 100);
    const passport = await CareerPassport.findOneAndUpdate({ userId: req.user.userId }, update, { new: true });
    res.json({ success: true, passport });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Add timeline event
router.post('/timeline', async (req, res) => {
  try {
    const passport = await CareerPassport.findOne({ userId: req.user.userId });
    if (!passport) return res.status(404).json({ success: false, message: 'Passport not found.' });
    passport.timeline.push(req.body);
    passport.timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    await passport.save();
    res.json({ success: true, timeline: passport.timeline });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Add/update skills
router.put('/skills', async (req, res) => {
  try {
    const passport = await CareerPassport.findOneAndUpdate({ userId: req.user.userId }, { skills: req.body.skills || [] }, { new: true });
    res.json({ success: true, skills: passport.skills });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Add endorsement
router.post('/endorse/:passportId', async (req, res) => {
  try {
    const passport = await CareerPassport.findOne({ passportId: req.params.passportId });
    if (!passport) return res.status(404).json({ success: false, message: 'Passport not found.' });
    passport.endorsements.push({ fromUserId: req.user.userId, fromName: req.user.name || '', ...req.body });
    await passport.save();
    res.json({ success: true, message: 'Endorsement added.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Verify skill
router.post('/verify-skill', async (req, res) => {
  const { skillName, source } = req.body;
  try {
    const passport = await CareerPassport.findOne({ userId: req.user.userId });
    if (!passport) return res.status(404).json({ success: false, message: 'Passport not found.' });
    const skill = passport.skills.find(s => s.name.toLowerCase() === (skillName || '').toLowerCase());
    if (skill) { skill.verified = true; skill.verifiedBy = source || 'TINCLO Assessment'; }
    passport.verificationLevel = Math.round((passport.skills.filter(s => s.verified).length / (passport.skills.length || 1)) * 100);
    await passport.save();
    res.json({ success: true, message: 'Skill verified.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Generate share link
router.post('/share', async (req, res) => {
  const { expiresInDays } = req.body;
  try {
    const passport = await CareerPassport.findOne({ userId: req.user.userId });
    if (!passport) return res.status(404).json({ success: false, message: 'Passport not found.' });
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + (expiresInDays || 30) * 86400000);
    passport.shareLinks.push({ token, expiresAt });
    if (passport.shareLinks.length > 10) passport.shareLinks = passport.shareLinks.slice(-10);
    await passport.save();
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/passport/shared/${token}`;
    res.json({ success: true, url, token, expiresAt });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Access shared link (public)
router.get('/shared/:token', async (req, res) => {
  try {
    const passport = await CareerPassport.findOne({ 'shareLinks.token': req.params.token }).lean();
    if (!passport) return res.status(404).json({ success: false, message: 'Invalid or expired link.' });
    const link = passport.shareLinks.find(l => l.token === req.params.token);
    if (!link || new Date(link.expiresAt) < new Date()) return res.status(410).json({ success: false, message: 'Link expired.' });
    await CareerPassport.findByIdAndUpdate(passport._id, { $inc: { totalViews: 1, recruiterViews: 1 } });
    delete passport.shareLinks;
    res.json({ success: true, passport });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Export passport
router.get('/export', async (req, res) => {
  try {
    const passport = await CareerPassport.findOne({ userId: req.user.userId }).lean();
    if (!passport) return res.status(404).json({ success: false, message: 'Passport not found.' });
    delete passport.shareLinks;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="career-passport.json"');
    res.json(passport);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Analytics
router.get('/analytics', async (req, res) => {
  try {
    const passport = await CareerPassport.findOne({ userId: req.user.userId }).select('totalViews recruiterViews searchAppearances profileCompletion verificationLevel passportScore').lean();
    res.json({ success: true, analytics: passport || {} });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
