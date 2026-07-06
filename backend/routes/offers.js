/**
 * /api/offers — Offer management (generate, accept, reject, track)
 */
import express from 'express';
import Offer from '../models/Offer.js';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ── Helper: notify via socket ────────────────────────────────────────────────
const notify = async (req, userId, title, message, type = 'offer') => {
  const notif = await Notification.create({ userId, audience: 'candidate', type, title, message, icon: 'gift' });
  const io = req.app.get('io');
  const online = req.app.get('onlineUsers');
  const sock = online?.get(userId);
  if (io && sock) io.to(sock).emit('notification:receive', { id: notif._id, type, title, message, time: 'Just now', read: false, icon: '🎉' });
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/offers — Generate/create an offer (recruiter)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const { jobId, candidateId, matchId, salary, joiningDate, offerLetterUrl, remarks, expiresAt } = req.body;

  if (!jobId || !candidateId)
    return res.status(400).json({ success: false, message: 'jobId and candidateId are required.' });

  try {
    const job = await Job.findById(jobId).select('title company').lean();

    const offer = await Offer.create({
      jobId,
      matchId: matchId || null,
      candidateId,
      recruiterId: req.user.userId,
      jobTitle: job?.title || '',
      company: job?.company || '',
      salary: salary || '',
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      offerLetterUrl: offerLetterUrl || null,
      remarks: remarks || '',
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // default 7 days
      status: 'pending',
    });

    // Update match status to 'offer'
    if (matchId) {
      await Match.findByIdAndUpdate(matchId, { applicationStatus: 'offer', statusUpdatedAt: new Date() });
    }

    // Notify candidate
    await notify(req, candidateId,
      `🎉 Offer Received: ${job?.title || 'a position'}`,
      `Congratulations! ${job?.company || 'A company'} has extended an offer for ${job?.title || 'a role'}.`
    );

    res.status(201).json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/offers/my — Candidate's offers
// ══════════════════════════════════════════════════════════════════════════════
router.get('/my', async (req, res) => {
  try {
    const offers = await Offer.find({ candidateId: req.user.userId })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/offers/recruiter — Recruiter's sent offers
// ══════════════════════════════════════════════════════════════════════════════
router.get('/recruiter', async (req, res) => {
  try {
    const offers = await Offer.find({ recruiterId: req.user.userId })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/offers/:id — Single offer details
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).lean();
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
    // Only involved parties can view
    if (offer.candidateId !== req.user.userId && offer.recruiterId !== req.user.userId && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });
    res.json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/offers/:id/accept — Candidate accepts offer
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/accept', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
    if (offer.candidateId !== req.user.userId)
      return res.status(403).json({ success: false, message: 'Access denied.' });
    if (offer.status !== 'pending')
      return res.status(400).json({ success: false, message: `Offer is already ${offer.status}.` });

    offer.status = 'accepted';
    offer.candidateResponse = req.body.response || 'Accepted';
    offer.respondedAt = new Date();
    await offer.save();

    // Notify recruiter
    await notify(req, offer.recruiterId,
      '✅ Offer Accepted',
      `Candidate accepted the offer for ${offer.jobTitle} at ${offer.company}.`,
      'offer_accepted'
    );

    res.json({ success: true, message: 'Offer accepted!', offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/offers/:id/reject — Candidate rejects offer
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/reject', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
    if (offer.candidateId !== req.user.userId)
      return res.status(403).json({ success: false, message: 'Access denied.' });
    if (offer.status !== 'pending')
      return res.status(400).json({ success: false, message: `Offer is already ${offer.status}.` });

    offer.status = 'rejected';
    offer.candidateResponse = req.body.reason || 'Declined';
    offer.respondedAt = new Date();
    await offer.save();

    await notify(req, offer.recruiterId,
      '❌ Offer Declined',
      `Candidate declined the offer for ${offer.jobTitle}.${req.body.reason ? ` Reason: ${req.body.reason}` : ''}`,
      'offer_rejected'
    );

    res.json({ success: true, message: 'Offer declined.', offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/offers/:id/withdraw — Recruiter withdraws offer
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/withdraw', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
    if (offer.recruiterId !== req.user.userId && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    offer.status = 'withdrawn';
    await offer.save();

    await notify(req, offer.candidateId,
      '⚠️ Offer Withdrawn',
      `The offer for ${offer.jobTitle} at ${offer.company} has been withdrawn.`,
      'offer_withdrawn'
    );

    res.json({ success: true, message: 'Offer withdrawn.', offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/offers/:id — Update offer details (recruiter)
// ══════════════════════════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
    if (offer.recruiterId !== req.user.userId && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const { salary, joiningDate, offerLetterUrl, remarks, expiresAt } = req.body;
    if (salary !== undefined)        offer.salary = salary;
    if (joiningDate !== undefined)   offer.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (offerLetterUrl !== undefined) offer.offerLetterUrl = offerLetterUrl;
    if (remarks !== undefined)       offer.remarks = remarks;
    if (expiresAt !== undefined)     offer.expiresAt = expiresAt ? new Date(expiresAt) : null;
    await offer.save();

    res.json({ success: true, message: 'Offer updated.', offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
