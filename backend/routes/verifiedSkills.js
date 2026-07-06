/**
 * /api/verified-skills — Verified Skills Ledger
 * Trusted credential system with multi-source verification, evidence, badges, certificates.
 */
import express from 'express';
import crypto from 'crypto';
import VerifiedSkill from '../models/verifiedSkills/VerifiedSkill.js';
import SkillVerification from '../models/verifiedSkills/SkillVerification.js';
import VerificationBadge from '../models/verifiedSkills/VerificationBadge.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ── Helpers ──────────────────────────────────────────────────────────────────
const calcConfidence = (sources) => {
  if (!sources || !sources.length) return 0;
  const weights = { assessment: 25, employer: 30, manager: 25, project: 20, hackathon: 15, certification: 20, university: 15, opensource: 10, mentor: 10, peer: 5, interview: 20, training: 10 };
  const total = sources.reduce((s, src) => s + (weights[src.type] || 5), 0);
  return Math.min(100, total);
};
const calcLevel = (sources) => {
  if (!sources || !sources.length) return 1;
  const types = new Set(sources.map(s => s.type));
  if (types.size >= 3) return 5;
  if (types.has('employer') || types.has('manager')) return 4;
  if (types.has('project') || types.has('hackathon')) return 3;
  if (types.has('assessment') || types.has('certification')) return 2;
  return 1;
};

// ══════════ GET ALL VERIFIED SKILLS ══════════

router.get('/', async (req, res) => {
  try {
    const skills = await VerifiedSkill.find({ userId: req.user.userId }).sort({ confidence: -1 }).lean();
    res.json({ success: true, skills });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ GET SINGLE ══════════

router.get('/:id', async (req, res) => {
  try {
    const skill = await VerifiedSkill.findOne({ _id: req.params.id, userId: req.user.userId }).lean();
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found.' });
    res.json({ success: true, skill });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ VERIFY VIA ASSESSMENT ══════════

router.post('/assessment', async (req, res) => {
  const { skill, score, assessmentTitle, category } = req.body;
  try {
    const source = { type: 'assessment', name: assessmentTitle || 'TINCLO Assessment', score: score || 0, date: new Date(), verifiedBy: 'TINCLO' };
    const evidence = { type: 'assessment_score', title: assessmentTitle || 'Assessment', score: score || 0, date: new Date() };
    const certId = `VSL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const existing = await VerifiedSkill.findOne({ userId: req.user.userId, skill });
    if (existing) {
      existing.sources.push(source);
      existing.evidence.push(evidence);
      existing.confidence = calcConfidence(existing.sources);
      existing.verificationLevel = calcLevel(existing.sources);
      existing.status = 'verified';
      existing.lastVerified = new Date();
      if (!existing.firstVerified) existing.firstVerified = new Date();
      await existing.save();
      return res.json({ success: true, skill: existing });
    }

    const vs = await VerifiedSkill.create({
      userId: req.user.userId, skill, category: category || '',
      sources: [source], evidence: [evidence],
      confidence: calcConfidence([source]), verificationLevel: calcLevel([source]),
      status: 'verified', firstVerified: new Date(), lastVerified: new Date(),
      certificateId: certId, verificationUrl: `/verify/skill/${certId}`,
    });
    res.status(201).json({ success: true, skill: vs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ VERIFY VIA EMPLOYER ══════════

router.post('/employer', async (req, res) => {
  const { skill, verifierName, verifierOrg, verifierRole, comments, score } = req.body;
  try {
    // Create verification request
    const vr = await SkillVerification.create({
      userId: req.user.userId, skill, requestType: 'employer',
      requestedBy: req.user.userId, verifierName, verifierOrg, verifierRole,
      comments, evidenceScore: score || 80, status: 'approved', verifiedAt: new Date(),
    });

    // Update verified skill
    const source = { type: 'employer', name: verifierOrg || verifierName, score: score || 80, date: new Date(), verifiedBy: verifierName };
    const evidence = { type: 'employer_review', title: `Verified by ${verifierName}`, description: comments, score: score || 80, date: new Date() };
    const certId = `VSL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const vs = await VerifiedSkill.findOneAndUpdate(
      { userId: req.user.userId, skill },
      { $push: { sources: source, evidence }, $set: { status: 'verified', lastVerified: new Date() }, $setOnInsert: { userId: req.user.userId, skill, firstVerified: new Date(), certificateId: certId, verificationUrl: `/verify/skill/${certId}` } },
      { upsert: true, new: true }
    );
    vs.confidence = calcConfidence(vs.sources);
    vs.verificationLevel = calcLevel(vs.sources);
    await vs.save();

    res.json({ success: true, skill: vs, verification: vr });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ VERIFY VIA PROJECT ══════════

router.post('/project', async (req, res) => {
  const { skill, projectTitle, projectUrl, techStack, score, category } = req.body;
  try {
    const source = { type: 'project', name: projectTitle, score: score || 70, date: new Date(), verifiedBy: 'Project Evidence' };
    const evidence = { type: 'project', title: projectTitle, url: projectUrl, score: score || 70, date: new Date() };
    const certId = `VSL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const vs = await VerifiedSkill.findOneAndUpdate(
      { userId: req.user.userId, skill },
      { $push: { sources: source, evidence }, $set: { status: 'verified', lastVerified: new Date(), category: category || '' }, $setOnInsert: { userId: req.user.userId, skill, firstVerified: new Date(), certificateId: certId, verificationUrl: `/verify/skill/${certId}` } },
      { upsert: true, new: true }
    );
    vs.confidence = calcConfidence(vs.sources);
    vs.verificationLevel = calcLevel(vs.sources);
    await vs.save();

    res.json({ success: true, skill: vs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ VERIFY VIA CERTIFICATE ══════════

router.post('/certificate', async (req, res) => {
  const { skill, certName, certUrl, issuer, issueDate, expiryDate, category } = req.body;
  try {
    const source = { type: 'certification', name: certName || issuer, score: 85, date: new Date(issueDate) || new Date(), verifiedBy: issuer };
    const evidence = { type: 'certificate', title: certName, url: certUrl, date: new Date(issueDate) || new Date() };
    const certId = `VSL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const vs = await VerifiedSkill.findOneAndUpdate(
      { userId: req.user.userId, skill },
      { $push: { sources: source, evidence }, $set: { status: 'verified', lastVerified: new Date(), expiresAt: expiryDate || null, category: category || '' }, $setOnInsert: { userId: req.user.userId, skill, firstVerified: new Date(), certificateId: certId, verificationUrl: `/verify/skill/${certId}` } },
      { upsert: true, new: true }
    );
    vs.confidence = calcConfidence(vs.sources);
    vs.verificationLevel = calcLevel(vs.sources);
    await vs.save();

    res.json({ success: true, skill: vs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ GENERIC VERIFY (any source) ══════════

router.post('/verify', async (req, res) => {
  const { skill, sourceType, sourceName, score, evidenceTitle, evidenceUrl, category } = req.body;
  try {
    const source = { type: sourceType || 'assessment', name: sourceName || 'TINCLO', score: score || 70, date: new Date(), verifiedBy: sourceName || 'TINCLO' };
    const evidence = { type: sourceType === 'employer' ? 'employer_review' : sourceType === 'project' ? 'project' : 'assessment_score', title: evidenceTitle || sourceName, url: evidenceUrl, score: score || 70, date: new Date() };
    const certId = `VSL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const vs = await VerifiedSkill.findOneAndUpdate(
      { userId: req.user.userId, skill },
      { $push: { sources: source, evidence }, $set: { status: 'verified', lastVerified: new Date(), category: category || '' }, $setOnInsert: { userId: req.user.userId, skill, firstVerified: new Date(), certificateId: certId, verificationUrl: `/verify/skill/${certId}` } },
      { upsert: true, new: true }
    );
    vs.confidence = calcConfidence(vs.sources);
    vs.verificationLevel = calcLevel(vs.sources);
    await vs.save();

    res.json({ success: true, skill: vs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ HISTORY ══════════

router.get('/history', async (req, res) => {
  try {
    const verifications = await SkillVerification.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, history: verifications });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ CERTIFICATES (badges) ══════════

router.get('/certificates', async (req, res) => {
  try {
    const badges = await VerificationBadge.find({ userId: req.user.userId, status: 'active' }).sort({ issuedAt: -1 }).lean();
    const skills = await VerifiedSkill.find({ userId: req.user.userId, status: 'verified', certificateId: { $ne: '' } }).select('skill certificateId verificationUrl confidence lastVerified').lean();
    res.json({ success: true, badges, skillCertificates: skills });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ANALYTICS ══════════

router.get('/analytics', async (req, res) => {
  try {
    const all = await VerifiedSkill.find({ userId: req.user.userId }).lean();
    const verified = all.filter(s => s.status === 'verified');
    const pending = all.filter(s => s.status === 'pending');
    const expired = all.filter(s => s.status === 'expired');
    const avgConfidence = verified.length ? Math.round(verified.reduce((s, v) => s + v.confidence, 0) / verified.length) : 0;
    const sourceCount = {};
    verified.forEach(v => v.sources?.forEach(src => { sourceCount[src.type] = (sourceCount[src.type] || 0) + 1; }));
    res.json({ success: true, analytics: { total: all.length, verified: verified.length, pending: pending.length, expired: expired.length, avgConfidence, sources: sourceCount } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SHARE ══════════

router.post('/share', async (req, res) => {
  const { skillIds, visibility } = req.body;
  try {
    if (skillIds?.length) {
      await VerifiedSkill.updateMany({ _id: { $in: skillIds }, userId: req.user.userId }, { isPublic: visibility !== 'private' });
    }
    res.json({ success: true, message: 'Sharing preferences updated.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PUBLIC VERIFY (no auth, for QR) ══════════
// This needs to be accessible without auth - handled via separate endpoint pattern
router.get('/public/:certId', async (req, res) => {
  try {
    const skill = await VerifiedSkill.findOne({ certificateId: req.params.certId, isPublic: true }).select('skill confidence verificationLevel status sources.type sources.name sources.date lastVerified firstVerified userId').lean();
    if (!skill) return res.status(404).json({ success: false, message: 'Certificate not found or private.' });
    res.json({ success: true, verified: true, skill });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
