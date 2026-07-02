import express from 'express';
import mongoose from 'mongoose';
import Match from '../models/Match.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { computeMatch } from '../services/matchingService.js';

const router = express.Router();

// All match routes require a valid JWT
router.use(authenticateToken);

// GET /api/matches/user/:userId — all matches for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const matches = await Match.find({ userId: req.params.userId })
      .populate('jobId')
      .sort({ matchScore: -1, matchedAt: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/matches — save (like) a job
router.post('/', async (req, res) => {
  const { userId, jobId } = req.body;

  if (!userId || !jobId)
    return res.status(400).json({ message: 'userId and jobId are required' });
  if (!mongoose.Types.ObjectId.isValid(jobId))
    return res.status(400).json({ message: 'Invalid jobId. Jobs must be saved in MongoDB before matching.' });

  try {
    const [user, job] = await Promise.all([
      User.findOne({ userId }),
      Job.findById(jobId),
    ]);

    if (!user) return res.status(400).json({ message: 'User not found. Please register or login first.' });
    if (!job)  return res.status(404).json({ message: 'Job not found' });

    // Compute rule-based match score
    const { matchScore, matchDetails } = computeMatch(user, job);

    const match = new Match({
      userId,
      jobId,
      applied: false,
      applicationStatus: 'saved',
      matchScore,
      matchDetails,
    });

    const newMatch      = await match.save();
    const populatedMatch = await Match.findById(newMatch._id).populate('jobId');
    res.status(201).json(populatedMatch);
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ message: 'Already matched with this job' });
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/matches/:id/apply — mark as applied (sets status → applied)
router.put('/:id/apply', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    match.applied = true;
    match.applicationStatus = 'applied';
    match.statusUpdatedAt   = new Date();
    await match.save();

    const populatedMatch = await Match.findById(match._id).populate('jobId');
    res.json(populatedMatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/matches/:id/status — update application status (candidate or recruiter)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['saved', 'applied', 'under_review', 'interview_scheduled', 'offer', 'rejected'];
  if (!valid.includes(status))
    return res.status(400).json({ message: `status must be one of: ${valid.join(', ')}` });

  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    match.applicationStatus = status;
    match.statusUpdatedAt   = new Date();
    if (status === 'applied') match.applied = true;
    await match.save();

    const populated = await Match.findById(match._id).populate('jobId');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/matches/:id — unsave / unlike a job
router.delete('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    await match.deleteOne();
    res.json({ message: 'Match deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
