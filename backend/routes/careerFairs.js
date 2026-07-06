/**
 * /api/career-fairs — Virtual Career Fair Platform
 * Digital hiring events, company booths, registration, chat, interviews, analytics.
 */
import express from 'express';
import CareerFair from '../models/careerFair/CareerFair.js';
import CompanyBooth from '../models/careerFair/CompanyBooth.js';
import CareerFairRegistration from '../models/careerFair/CareerFairRegistration.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ══════════ PUBLIC: LIST & GET ══════════

router.get('/', async (req, res) => {
  const { status, type, limit } = req.query;
  try {
    const filter = { visibility: 'public' };
    if (status) filter.status = status;
    else filter.status = { $in: ['upcoming', 'registration', 'live', 'completed'] };
    if (type) filter.type = type;
    const fairs = await CareerFair.find(filter).select('-sessions -companies').sort({ startDate: -1 }).limit(parseInt(limit) || 20).lean();
    res.json({ success: true, fairs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const fair = await CareerFair.findById(req.params.id).lean();
    if (!fair) return res.status(404).json({ success: false, message: 'Career fair not found.' });
    res.json({ success: true, fair });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ AUTH REQUIRED ══════════
router.use(authenticateToken);

// ── Create career fair ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const fair = await CareerFair.create({ ...req.body, createdBy: req.user.userId, orgId: req.user.orgId || '' });
    res.status(201).json({ success: true, fair });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Update career fair ───────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const fair = await CareerFair.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.userId }, req.body, { new: true });
    if (!fair) return res.status(404).json({ success: false, message: 'Not found or unauthorized.' });
    res.json({ success: true, fair });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Delete career fair ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await CareerFair.findOneAndDelete({ _id: req.params.id, createdBy: req.user.userId });
    res.json({ success: true, message: 'Career fair deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Register for career fair ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { careerFairId, skills, preferredRoles, resume } = req.body;
  try {
    const fair = await CareerFair.findById(careerFairId);
    if (!fair) return res.status(404).json({ success: false, message: 'Career fair not found.' });
    if (fair.registrationCount >= fair.maxAttendees) return res.status(400).json({ success: false, message: 'Event is full.' });

    const reg = await CareerFairRegistration.findOneAndUpdate(
      { careerFairId, userId: req.user.userId },
      { careerFairId, userId: req.user.userId, userName: req.user.name || '', email: req.user.email || '', skills: skills || [], preferredRoles: preferredRoles || [], resume: resume || '' },
      { upsert: true, new: true }
    );
    await CareerFair.findByIdAndUpdate(careerFairId, { $inc: { registrationCount: 1 } });
    res.status(201).json({ success: true, registration: reg });
  } catch (e) {
    if (e.code === 11000) return res.json({ success: true, message: 'Already registered.' });
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── My registrations ─────────────────────────────────────────────────────────
router.get('/my/registrations', async (req, res) => {
  try {
    const regs = await CareerFairRegistration.find({ userId: req.user.userId }).populate('careerFairId', 'title status startDate endDate type banner').sort({ createdAt: -1 }).lean();
    res.json({ success: true, registrations: regs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Booths ───────────────────────────────────────────────────────────────────
router.get('/booths/:fairId', async (req, res) => {
  try {
    const booths = await CompanyBooth.find({ careerFairId: req.params.fairId }).sort({ visitors: -1 }).lean();
    res.json({ success: true, booths });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/booth/:boothId', async (req, res) => {
  try {
    const booth = await CompanyBooth.findById(req.params.boothId).lean();
    if (!booth) return res.status(404).json({ success: false, message: 'Booth not found.' });
    // Increment visitors
    await CompanyBooth.findByIdAndUpdate(req.params.boothId, { $inc: { visitors: 1 } });
    res.json({ success: true, booth });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/booths', async (req, res) => {
  try {
    const booth = await CompanyBooth.create(req.body);
    res.status(201).json({ success: true, booth });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Chat (booth chat message) ────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { boothId, message } = req.body;
  try {
    await CompanyBooth.findByIdAndUpdate(boothId, { $inc: { chats: 1 } });
    // Emit via WebSocket
    const io = req.app.get('io');
    if (io) io.emit('career-fair:chat', { boothId, userId: req.user.userId, userName: req.user.name || '', message, at: new Date() });
    res.json({ success: true, message: 'Message sent.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Interview scheduling ─────────────────────────────────────────────────────
router.post('/interview', async (req, res) => {
  const { boothId, slotIndex } = req.body;
  try {
    const booth = await CompanyBooth.findById(boothId);
    if (!booth) return res.status(404).json({ success: false, message: 'Booth not found.' });
    if (!booth.interviewSlots[slotIndex]) return res.status(400).json({ success: false, message: 'Invalid slot.' });
    if (booth.interviewSlots[slotIndex].booked) return res.status(400).json({ success: false, message: 'Slot already booked.' });

    booth.interviewSlots[slotIndex].booked = true;
    booth.interviewSlots[slotIndex].candidateId = req.user.userId;
    await booth.save();

    // Track in registration
    await CareerFairRegistration.findOneAndUpdate(
      { careerFairId: booth.careerFairId, userId: req.user.userId },
      { $push: { interviewsScheduled: { boothId, time: booth.interviewSlots[slotIndex].time, status: 'scheduled' } } }
    );
    await CareerFair.findByIdAndUpdate(booth.careerFairId, { $inc: { interviewCount: 1 } });

    res.json({ success: true, message: 'Interview scheduled.', slot: booth.interviewSlots[slotIndex] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Resume drop ──────────────────────────────────────────────────────────────
router.post('/resume-drop', async (req, res) => {
  const { boothId, resume } = req.body;
  try {
    await CompanyBooth.findByIdAndUpdate(boothId, { $inc: { resumeDrops: 1 } });
    res.json({ success: true, message: 'Resume submitted to booth.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics/:fairId', async (req, res) => {
  try {
    const fair = await CareerFair.findById(req.params.fairId).select('title registrationCount attendeeCount applicationCount interviewCount offerCount').lean();
    if (!fair) return res.status(404).json({ success: false, message: 'Not found.' });
    const booths = await CompanyBooth.find({ careerFairId: req.params.fairId }).select('companyName visitors applications chats resumeDrops').sort({ visitors: -1 }).lean();
    const totalVisitors = booths.reduce((s, b) => s + (b.visitors || 0), 0);
    const totalApps = booths.reduce((s, b) => s + (b.applications || 0), 0);
    res.json({ success: true, analytics: { ...fair, totalBoothVisitors: totalVisitors, totalApplications: totalApps, boothStats: booths } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Certificates ─────────────────────────────────────────────────────────────
router.get('/certificates', async (req, res) => {
  try {
    const regs = await CareerFairRegistration.find({ userId: req.user.userId, certificateIssued: true }).populate('careerFairId', 'title startDate').lean();
    const certs = regs.map(r => ({ fairTitle: r.careerFairId?.title, date: r.careerFairId?.startDate, status: r.status }));
    res.json({ success: true, certificates: certs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Feedback ─────────────────────────────────────────────────────────────────
router.post('/feedback', async (req, res) => {
  const { careerFairId, rating, feedback } = req.body;
  try {
    await CareerFairRegistration.findOneAndUpdate(
      { careerFairId, userId: req.user.userId },
      { rating, feedback }
    );
    res.json({ success: true, message: 'Feedback submitted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
