/**
 * /api/referrals — Referral system (share links, recommend candidates, track)
 */
import express from 'express';
import crypto from 'crypto';
import Referral from '../models/Referral.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/referrals — Create a referral
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const { candidateEmail, candidateName, jobId, jobTitle, company } = req.body;
  if (!candidateEmail) return res.status(400).json({ success: false, message: 'candidateEmail is required.' });

  try {
    const referralCode = crypto.randomBytes(6).toString('hex');
    const referral = await Referral.create({
      referrerId: req.user.userId,
      referrerName: req.user.name || '',
      candidateEmail,
      candidateName: candidateName || '',
      jobId: jobId || null,
      jobTitle: jobTitle || '',
      company: company || '',
      referralCode,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    res.status(201).json({
      success: true,
      referral,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/signup?ref=${referralCode}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/referrals/my — List referrals I've made
// ══════════════════════════════════════════════════════════════════════════════
router.get('/my', async (req, res) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user.userId })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, referrals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/referrals/for-me — Referrals where I'm the candidate
// ══════════════════════════════════════════════════════════════════════════════
router.get('/for-me', async (req, res) => {
  try {
    const referrals = await Referral.find({ candidateId: req.user.userId })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, referrals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/referrals/:id/status — Update referral status (recruiter/admin)
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'signed_up', 'applied', 'interviewed', 'hired', 'rejected', 'expired'];
  if (!valid.includes(status))
    return res.status(400).json({ success: false, message: `Status must be one of: ${valid.join(', ')}` });

  try {
    const referral = await Referral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'Referral not found.' });

    referral.status = status;
    if (status === 'hired') {
      referral.approvedBy = req.user.userId;
      referral.approvedAt = new Date();
    }
    await referral.save();

    // Notify referrer on status change
    await Notification.create({
      userId: referral.referrerId,
      audience: 'candidate',
      type: 'referral_update',
      title: `Referral Update: ${referral.candidateName || referral.candidateEmail}`,
      message: `Your referral status is now: ${status.replace('_', ' ')}`,
      icon: 'users',
    }).catch(() => {});

    res.json({ success: true, referral });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/referrals/validate/:code — Validate a referral code (public-ish, for signup)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/validate/:code', async (req, res) => {
  try {
    const referral = await Referral.findOne({
      referralCode: req.params.code,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!referral) return res.json({ success: true, valid: false });
    res.json({
      success: true,
      valid: true,
      referrerName: referral.referrerName,
      jobTitle: referral.jobTitle,
      company: referral.company,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
