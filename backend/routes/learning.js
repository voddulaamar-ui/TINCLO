/**
 * /api/learning — Learning Platform master route
 * Courses, lessons, quizzes, challenges, community, events, mentors, leaderboards, progress.
 */
import express from 'express';
import Course from '../models/learning/Course.js';
import Lesson from '../models/learning/Lesson.js';
import Quiz from '../models/learning/Quiz.js';
import CodingChallenge from '../models/learning/CodingChallenge.js';
import Certificate from '../models/learning/Certificate.js';
import LearningProgress from '../models/learning/LearningProgress.js';
import Leaderboard from '../models/learning/Leaderboard.js';
import CommunityPost from '../models/learning/CommunityPost.js';
import Comment from '../models/learning/Comment.js';
import Event from '../models/learning/Event.js';
import Mentor from '../models/learning/Mentor.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import crypto from 'crypto';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// COURSES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/courses', async (req, res) => {
  try {
    const { search, category, difficulty } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { isPublished: true };
    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    const [courses, total] = await Promise.all([
      Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Course.countDocuments(filter),
    ]);
    res.json(paginatedResponse(courses, total, page, limit));
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Not found.' });
    const lessons = await Lesson.find({ courseId: course._id }).sort({ moduleIndex: 1, orderIndex: 1 }).lean();
    res.json({ success: true, course, lessons });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/courses', authenticateToken, async (req, res) => {
  try {
    const slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const course = await Course.create({ ...req.body, slug, instructorId: req.user.userId });
    res.status(201).json({ success: true, course });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ── Enroll in a course ───────────────────────────────────────────────────────
router.post('/courses/:id/enroll', authenticateToken, async (req, res) => {
  try {
    await LearningProgress.findOneAndUpdate(
      { userId: req.user.userId, courseId: req.params.id, type: 'course' },
      { userId: req.user.userId, courseId: req.params.id, type: 'course', status: 'enrolled' },
      { upsert: true }
    );
    await Course.findByIdAndUpdate(req.params.id, { $inc: { enrolledCount: 1 } });
    res.json({ success: true, message: 'Enrolled successfully!' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LESSONS & PROGRESS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/lessons/:id/complete', authenticateToken, async (req, res) => {
  try {
    await LearningProgress.findOneAndUpdate(
      { userId: req.user.userId, lessonId: req.params.id, type: 'lesson' },
      { status: 'completed', completedAt: new Date(), progress: 100 },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await LearningProgress.find({ userId: req.user.userId }).sort({ updatedAt: -1 }).limit(50).lean();
    res.json({ success: true, progress });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// QUIZZES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/quizzes/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) return res.status(404).json({ success: false, message: 'Not found.' });
    // Hide answers
    const questions = quiz.questions.map(q => ({ ...q, answer: undefined, explanation: undefined }));
    res.json({ success: true, quiz: { ...quiz, questions } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/quizzes/:id/submit', authenticateToken, async (req, res) => {
  const { answers } = req.body; // { questionId: answer }
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) return res.status(404).json({ success: false, message: 'Not found.' });
    let correct = 0;
    const results = quiz.questions.map(q => {
      const userAnswer = answers?.[q._id.toString()] || '';
      const isCorrect = userAnswer.toLowerCase().trim() === (q.answer || '').toLowerCase().trim();
      if (isCorrect) correct++;
      return { questionId: q._id, correct: isCorrect, correctAnswer: q.answer, explanation: q.explanation };
    });
    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;
    await LearningProgress.findOneAndUpdate(
      { userId: req.user.userId, type: 'quiz', lessonId: req.params.id },
      { status: passed ? 'completed' : 'in_progress', score, completedAt: passed ? new Date() : null },
      { upsert: true }
    );
    res.json({ success: true, score, passed, correct, total: quiz.questions.length, results });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CODING CHALLENGES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/challenges', async (req, res) => {
  try {
    const { difficulty, category, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { isPublished: true };
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };
    const [challenges, total] = await Promise.all([
      CodingChallenge.find(filter).select('-solution -testCases').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CodingChallenge.countDocuments(filter),
    ]);
    res.json(paginatedResponse(challenges, total, page, limit));
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/challenges/:id', async (req, res) => {
  try {
    const ch = await CodingChallenge.findById(req.params.id).lean();
    if (!ch) return res.status(404).json({ success: false, message: 'Not found.' });
    const visible = { ...ch, solution: undefined, testCases: ch.testCases.filter(t => !t.isHidden) };
    res.json({ success: true, challenge: visible });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/challenges/:id/submit', authenticateToken, async (req, res) => {
  const { code, language } = req.body;
  try {
    const ch = await CodingChallenge.findById(req.params.id);
    if (!ch) return res.status(404).json({ success: false, message: 'Not found.' });
    // Simplified: mark as attempted (real execution would need a sandbox)
    ch.attemptCount++;
    const passed = true; // placeholder — real impl would run test cases
    if (passed) ch.solvedCount++;
    await ch.save();
    await LearningProgress.findOneAndUpdate(
      { userId: req.user.userId, challengeId: ch._id, type: 'challenge' },
      { status: passed ? 'completed' : 'in_progress', score: passed ? ch.points : 0, completedAt: passed ? new Date() : null, xpEarned: passed ? ch.points : 0 },
      { upsert: true }
    );
    // Update leaderboard
    if (passed) {
      await Leaderboard.findOneAndUpdate(
        { userId: req.user.userId, type: 'coding' },
        { $inc: { score: ch.points, xp: ch.points, totalChallengesSolved: 1 }, username: req.user.name || '' },
        { upsert: true }
      );
    }
    res.json({ success: true, passed, points: passed ? ch.points : 0 });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/certificates', authenticateToken, async (req, res) => {
  try {
    const certs = await Certificate.find({ userId: req.user.userId }).sort({ issueDate: -1 }).lean();
    res.json({ success: true, certificates: certs });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/certificates/generate', authenticateToken, async (req, res) => {
  const { type, title, courseId, challengeId, skillsVerified, score } = req.body;
  try {
    const cert = await Certificate.create({
      userId: req.user.userId, type: type || 'course', title,
      courseId, challengeId, skillsVerified: skillsVerified || [],
      score: score || 0, credentialId: `TINCLO-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    });
    await Leaderboard.findOneAndUpdate(
      { userId: req.user.userId, type: 'overall' },
      { $inc: { totalCertificates: 1, xp: 50 } },
      { upsert: true }
    );
    res.status(201).json({ success: true, certificate: cert });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEADERBOARDS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/leaderboards/:type', async (req, res) => {
  try {
    const entries = await Leaderboard.find({ type: req.params.type }).sort({ score: -1 }).limit(50).lean();
    res.json({ success: true, leaderboard: entries });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COMMUNITY (Posts, Q&A, Blogs)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/community', async (req, res) => {
  try {
    const { type, category, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { isPublished: true };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };
    const [posts, total] = await Promise.all([
      CommunityPost.find(filter).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      CommunityPost.countDocuments(filter),
    ]);
    res.json(paginatedResponse(posts, total, page, limit));
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/community', authenticateToken, async (req, res) => {
  try {
    const post = await CommunityPost.create({ ...req.body, authorId: req.user.userId, authorName: req.user.name || '' });
    res.status(201).json({ success: true, post });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/community/:id/vote', authenticateToken, async (req, res) => {
  const { vote } = req.body; // 1 or -1
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Not found.' });
    const existing = post.votedBy.find(v => v.userId === req.user.userId);
    if (existing) { existing.vote = vote; }
    else { post.votedBy.push({ userId: req.user.userId, vote }); }
    post.upvotes = post.votedBy.filter(v => v.vote === 1).length;
    post.downvotes = post.votedBy.filter(v => v.vote === -1).length;
    await post.save();
    res.json({ success: true, upvotes: post.upvotes, downvotes: post.downvotes });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ── Comments ─────────────────────────────────────────────────────────────────
router.get('/community/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, comments });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/community/:id/comments', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.create({ postId: req.params.id, authorId: req.user.userId, authorName: req.user.name || '', content: req.body.content, parentId: req.body.parentId || null });
    await CommunityPost.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } });
    res.status(201).json({ success: true, comment });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/events', async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = { isPublished: true };
    if (type) filter.type = type;
    if (status) filter.status = status;
    const events = await Event.find(filter).sort({ startDate: -1 }).limit(30).lean();
    res.json({ success: true, events });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/events', authenticateToken, async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, organizerId: req.user.userId });
    res.status(201).json({ success: true, event });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/events/:id/register', authenticateToken, async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { $inc: { registeredCount: 1 } });
    res.json({ success: true, message: 'Registered!' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// MENTORS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/mentors', async (req, res) => {
  try {
    const { expertise } = req.query;
    const filter = { isActive: true };
    if (expertise) filter.expertise = new RegExp(expertise, 'i');
    const mentors = await Mentor.find(filter).sort({ rating: -1 }).limit(30).lean();
    res.json({ success: true, mentors });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/mentors/register', authenticateToken, async (req, res) => {
  try {
    const mentor = await Mentor.findOneAndUpdate(
      { userId: req.user.userId },
      { userId: req.user.userId, ...req.body, name: req.body.name || req.user.name || '' },
      { upsert: true, new: true }
    );
    res.json({ success: true, mentor });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEARNING DASHBOARD (aggregated stats)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [progress, certs, leaderEntry] = await Promise.all([
      LearningProgress.find({ userId }).lean(),
      Certificate.countDocuments({ userId }),
      Leaderboard.findOne({ userId, type: 'overall' }).lean(),
    ]);
    const enrolled = progress.filter(p => p.type === 'course');
    const completed = progress.filter(p => p.status === 'completed');
    res.json({
      success: true,
      dashboard: {
        enrolledCourses: enrolled.length,
        completedCourses: enrolled.filter(p => p.status === 'completed').length,
        challengesSolved: progress.filter(p => p.type === 'challenge' && p.status === 'completed').length,
        certificates: certs,
        xp: leaderEntry?.xp || 0,
        level: leaderEntry?.level || 1,
        streak: leaderEntry?.streak || 0,
        rank: leaderEntry?.rank || 0,
        badges: leaderEntry?.badges || [],
      },
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
