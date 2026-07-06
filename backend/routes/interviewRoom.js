/**
 * /api/interview-room — AI Interview Room
 * Live coding, whiteboard, video, transcripts, scorecards, AI summaries.
 */
import express from 'express';
import InterviewRoom from '../models/interviewRoom/InterviewRoom.js';
import InterviewScorecard from '../models/interviewRoom/InterviewScorecard.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ── Create room ──────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const room = await InterviewRoom.create({ ...req.body, createdBy: req.user.userId, orgId: req.user.orgId || '' });
    res.status(201).json({ success: true, room });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── List rooms ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, candidateId } = req.query;
  try {
    const filter = {};
    if (status) filter.status = status;
    if (candidateId) filter.candidateId = candidateId;
    else filter.$or = [{ createdBy: req.user.userId }, { candidateId: req.user.userId }, { 'interviewers.userId': req.user.userId }];
    const rooms = await InterviewRoom.find(filter).sort({ scheduledAt: -1 }).limit(30).lean();
    res.json({ success: true, rooms });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Get room ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const room = await InterviewRoom.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });
    res.json({ success: true, room });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Start interview ──────────────────────────────────────────────────────────
router.post('/:id/start', async (req, res) => {
  try {
    const room = await InterviewRoom.findByIdAndUpdate(req.params.id, { status: 'live', startedAt: new Date() }, { new: true });
    const io = req.app.get('io');
    if (io) io.emit('interview:started', { roomId: req.params.id });
    res.json({ success: true, room });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── End interview ────────────────────────────────────────────────────────────
router.post('/:id/end', async (req, res) => {
  try {
    const room = await InterviewRoom.findByIdAndUpdate(req.params.id, { status: 'completed', endedAt: new Date() }, { new: true });
    const io = req.app.get('io');
    if (io) io.emit('interview:ended', { roomId: req.params.id });
    res.json({ success: true, room });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Update code (collaborative) ──────────────────────────────────────────────
router.patch('/:id/code', async (req, res) => {
  const { codeContent, codeLanguage } = req.body;
  try {
    await InterviewRoom.findByIdAndUpdate(req.params.id, { codeContent, ...(codeLanguage && { codeLanguage }) });
    const io = req.app.get('io');
    if (io) io.emit('interview:code-update', { roomId: req.params.id, codeContent, codeLanguage, by: req.user.userId });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Update whiteboard ────────────────────────────────────────────────────────
router.patch('/:id/whiteboard', async (req, res) => {
  const { whiteboardData } = req.body;
  try {
    await InterviewRoom.findByIdAndUpdate(req.params.id, { whiteboardData });
    const io = req.app.get('io');
    if (io) io.emit('interview:whiteboard-update', { roomId: req.params.id, whiteboardData, by: req.user.userId });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Save transcript ──────────────────────────────────────────────────────────
router.patch('/:id/transcript', async (req, res) => {
  const { transcript } = req.body;
  try {
    await InterviewRoom.findByIdAndUpdate(req.params.id, { transcript });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── AI Summary ───────────────────────────────────────────────────────────────
router.post('/:id/ai-summary', async (req, res) => {
  try {
    const room = await InterviewRoom.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ success: false, message: 'Not found.' });
    // Generate AI summary (simplified — in production use AI service)
    const summary = `Interview with ${room.candidateName} for ${room.jobTitle || room.title}. Duration: ${room.duration} minutes. Type: ${room.type}.`;
    const strengths = ['Good communication', 'Strong problem-solving approach'];
    const concerns = room.codeContent ? [] : ['No code submitted during session'];
    await InterviewRoom.findByIdAndUpdate(req.params.id, { aiSummary: summary, aiStrengths: strengths, aiConcerns: concerns });
    res.json({ success: true, summary, strengths, concerns });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Submit scorecard ─────────────────────────────────────────────────────────
router.post('/:id/scorecard', async (req, res) => {
  const { scores, overallScore, strengths, weaknesses, recommendation, comments, decision, nextSteps } = req.body;
  try {
    const room = await InterviewRoom.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });

    const scorecard = await InterviewScorecard.findOneAndUpdate(
      { roomId: req.params.id, interviewerId: req.user.userId },
      { roomId: req.params.id, interviewerId: req.user.userId, interviewerName: req.user.name || '',
        candidateId: room.candidateId, scores, overallScore, strengths, weaknesses,
        recommendation, comments, decision, nextSteps, status: 'submitted', submittedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, scorecard });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Get scorecards for room ──────────────────────────────────────────────────
router.get('/:id/scorecards', async (req, res) => {
  try {
    const scorecards = await InterviewScorecard.find({ roomId: req.params.id }).lean();
    res.json({ success: true, scorecards });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Candidate playback (review after interview) ──────────────────────────────
router.get('/:id/playback', async (req, res) => {
  try {
    const room = await InterviewRoom.findById(req.params.id).select('title type candidateName scheduledAt duration codeContent whiteboardData transcript aiSummary aiStrengths aiConcerns recordingUrl status').lean();
    if (!room) return res.status(404).json({ success: false, message: 'Not found.' });
    const scorecards = await InterviewScorecard.find({ roomId: req.params.id }).select('overallScore recommendation strengths weaknesses').lean();
    res.json({ success: true, playback: { ...room, scorecards } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
