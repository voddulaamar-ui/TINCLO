/**
 * /api/interviews — Interview scheduling, timeline, and calendar export
 */
import express from 'express';
import Interview from '../models/Interview.js';
import Notification from '../models/Notification.js';
import Job from '../models/Job.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ── Helper: notify via socket ────────────────────────────────────────────────
const notify = async (req, userId, title, message, type = 'interview') => {
  const notif = await Notification.create({ userId, audience: 'candidate', type, title, message, icon: 'calendar' });
  const io = req.app.get('io');
  const online = req.app.get('onlineUsers');
  const sock = online?.get(userId);
  if (io && sock) io.to(sock).emit('notification:receive', { id: notif._id, type, title, message, time: 'Just now', read: false, icon: '📅' });
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/interviews — Schedule an interview (recruiter)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const { jobId, candidateId, matchId, scheduledDate, scheduledTime, duration,
    interviewType, mode, meetingLink, meetingNotes, location, round } = req.body;

  if (!jobId || !candidateId || !scheduledDate)
    return res.status(400).json({ success: false, message: 'jobId, candidateId, and scheduledDate are required.' });

  try {
    const job = await Job.findById(jobId).select('title company').lean();
    const interview = await Interview.create({
      jobId, matchId, candidateId,
      recruiterId: req.user.userId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime: scheduledTime || '',
      duration: duration || 60,
      interviewType: interviewType || 'online',
      mode: mode || 'Online',
      meetingLink: meetingLink || '',
      meetingNotes: meetingNotes || '',
      location: location || '',
      round: round || 1,
      jobTitle: job?.title || '',
      company: job?.company || '',
      status: 'scheduled',
      stage: 'interview_scheduled',
    });

    // Notify candidate
    await notify(req, candidateId,
      `📅 Interview Scheduled: ${job?.title || 'a position'}`,
      `Your interview at ${job?.company || 'a company'} is scheduled for ${new Date(scheduledDate).toLocaleDateString()}.`
    );

    res.status(201).json({ success: true, interview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/interviews/my — Candidate's interviews
// ══════════════════════════════════════════════════════════════════════════════
router.get('/my', async (req, res) => {
  try {
    const interviews = await Interview.find({ candidateId: req.user.userId })
      .sort({ scheduledDate: -1 }).lean();
    res.json({ success: true, interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/interviews/recruiter — Recruiter's scheduled interviews
// ══════════════════════════════════════════════════════════════════════════════
router.get('/recruiter', async (req, res) => {
  try {
    const interviews = await Interview.find({ recruiterId: req.user.userId })
      .sort({ scheduledDate: -1 }).lean();
    res.json({ success: true, interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/interviews/:id/accept — Candidate accepts interview
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/accept', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (interview.candidateId !== req.user.userId)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    interview.status = 'accepted';
    await interview.save();

    // Notify recruiter
    await notify(req, interview.recruiterId,
      '✅ Interview Accepted',
      `Candidate accepted the interview for ${interview.jobTitle} on ${new Date(interview.scheduledDate).toLocaleDateString()}.`,
      'interview_accepted'
    );

    res.json({ success: true, message: 'Interview accepted.', interview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/interviews/:id/reschedule — Request reschedule
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/reschedule', async (req, res) => {
  const { reason, newDate } = req.body;
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    interview.status = 'reschedule_requested';
    interview.rescheduleReason = reason || '';
    if (newDate) interview.rescheduleDate = new Date(newDate);
    await interview.save();

    // Notify the other party
    const targetId = req.user.userId === interview.candidateId ? interview.recruiterId : interview.candidateId;
    await notify(req, targetId,
      '🔄 Reschedule Requested',
      `A reschedule has been requested for the ${interview.jobTitle} interview.${reason ? ` Reason: ${reason}` : ''}`,
      'interview_reschedule'
    );

    res.json({ success: true, message: 'Reschedule request sent.', interview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/interviews/:id/cancel — Cancel interview
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/cancel', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    // Allow either party to cancel
    if (interview.candidateId !== req.user.userId && interview.recruiterId !== req.user.userId)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    interview.status = 'cancelled';
    await interview.save();

    const targetId = req.user.userId === interview.candidateId ? interview.recruiterId : interview.candidateId;
    await notify(req, targetId,
      '❌ Interview Cancelled',
      `The interview for ${interview.jobTitle} has been cancelled.`,
      'interview_cancelled'
    );

    res.json({ success: true, message: 'Interview cancelled.', interview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/interviews/:id/complete — Mark interview as completed (recruiter)
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/complete', async (req, res) => {
  const { outcome } = req.body; // 'passed' | 'failed' | 'on_hold'
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (interview.recruiterId !== req.user.userId && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    interview.status = 'completed';
    interview.stage = 'interview_completed';
    if (outcome) interview.outcome = outcome;
    await interview.save();

    res.json({ success: true, message: 'Interview marked as completed.', interview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/interviews/:id/timeline — Application timeline for a job
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id/timeline', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).lean();
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    const STAGES = ['applied', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offer', 'joined'];
    const currentIdx = STAGES.indexOf(interview.stage);

    const timeline = STAGES.map((stage, i) => ({
      stage,
      label: stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      completed: i <= currentIdx,
      current: i === currentIdx,
    }));

    res.json({ success: true, timeline, currentStage: interview.stage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/interviews/:id/ics — Export interview as .ics calendar file
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id/ics', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).lean();
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    const start = new Date(interview.scheduledDate);
    const end = new Date(start.getTime() + (interview.duration || 60) * 60000);

    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TINCLO//Interview//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:Interview - ${interview.jobTitle} at ${interview.company}`,
      `DESCRIPTION:${interview.interviewType} interview (Round ${interview.round})\\n${interview.meetingNotes || ''}`,
      interview.meetingLink ? `URL:${interview.meetingLink}` : '',
      interview.location ? `LOCATION:${interview.location}` : '',
      `STATUS:${interview.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="interview-${interview._id}.ics"`);
    res.send(ics);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
