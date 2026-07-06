/**
 * /api/interview-feedback — Structured interview feedback from recruiters
 */
import express from 'express';
import InterviewFeedback from '../models/InterviewFeedback.js';
import Interview from '../models/Interview.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/interview-feedback — Submit feedback for an interview (recruiter)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const {
    interviewId, technicalSkills, communication, problemSolving,
    cultureFit, overallRating, strengths, weaknesses, remarks,
    recommendation, visibleToCandidate,
  } = req.body;

  if (!interviewId) return res.status(400).json({ success: false, message: 'interviewId is required.' });

  try {
    const interview = await Interview.findById(interviewId);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (interview.recruiterId !== req.user.userId && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Only the interviewer can submit feedback.' });

    const feedback = await InterviewFeedback.findOneAndUpdate(
      { interviewId },
      {
        interviewId,
        jobId: interview.jobId,
        candidateId: interview.candidateId,
        recruiterId: req.user.userId,
        technicalSkills:    technicalSkills || null,
        communication:      communication || null,
        problemSolving:     problemSolving || null,
        cultureFit:         cultureFit || null,
        overallRating:      overallRating || null,
        strengths:          strengths || '',
        weaknesses:         weaknesses || '',
        remarks:            remarks || '',
        recommendation:     recommendation || 'maybe',
        visibleToCandidate: visibleToCandidate || false,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, feedback });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Feedback already exists for this interview.' });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/interview-feedback/interview/:interviewId — Get feedback for an interview
// ══════════════════════════════════════════════════════════════════════════════
router.get('/interview/:interviewId', async (req, res) => {
  try {
    const feedback = await InterviewFeedback.findOne({ interviewId: req.params.interviewId }).lean();
    if (!feedback) return res.status(404).json({ success: false, message: 'No feedback found.' });

    // Candidates can only see if visibleToCandidate is true
    if (feedback.candidateId === req.user.userId && !feedback.visibleToCandidate) {
      return res.status(403).json({ success: false, message: 'Feedback not shared with you yet.' });
    }

    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/interview-feedback/candidate/:candidateId — All feedback for a candidate
// ══════════════════════════════════════════════════════════════════════════════
router.get('/candidate/:candidateId', async (req, res) => {
  try {
    const filter = { candidateId: req.params.candidateId };
    // Candidates see only visible feedback; recruiters/admins see all
    if (req.user.userId === req.params.candidateId) {
      filter.visibleToCandidate = true;
    }

    const feedbacks = await InterviewFeedback.find(filter)
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/interview-feedback/:id/visibility — Toggle candidate visibility
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/visibility', async (req, res) => {
  try {
    const feedback = await InterviewFeedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found.' });
    if (feedback.recruiterId !== req.user.userId && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    feedback.visibleToCandidate = !feedback.visibleToCandidate;
    await feedback.save();

    res.json({ success: true, visibleToCandidate: feedback.visibleToCandidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
