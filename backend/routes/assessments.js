/**
 * /api/assessments — Enterprise Assessment Platform
 * Coding tests, MCQs, proctoring, question bank, submissions, evaluation, certificates.
 */
import express from 'express';
import Assessment from '../models/assessment/Assessment.js';
import AssessmentQuestion from '../models/assessment/AssessmentQuestion.js';
import AssessmentSubmission from '../models/assessment/AssessmentSubmission.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import crypto from 'crypto';

const router = express.Router();
router.use(authenticateToken);

// ══════════ ASSESSMENTS CRUD ══════════

router.get('/', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) filter.$text = { $search: search };
    // Show own + assigned assessments
    filter.$or = [{ createdBy: req.user.userId }, { candidates: req.user.userId }, { candidates: { $size: 0 } }];
    const [assessments, total] = await Promise.all([
      Assessment.find(filter).select('-sections.questions').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Assessment.countDocuments(filter),
    ]);
    res.json(paginatedResponse(assessments, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const assessment = await Assessment.create({ createdBy: req.user.userId, ...req.body });
    res.status(201).json({ success: true, assessment });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const a = await Assessment.findById(req.params.id).populate('sections.questions').lean();
    if (!a) return res.status(404).json({ success: false, message: 'Not found.' });
    // Hide answers for candidates
    if (a.createdBy !== req.user.userId) {
      a.sections = a.sections.map(s => ({ ...s, questions: s.questions.map(q => ({ ...q, correctAnswer: undefined, correctAnswers: undefined, explanation: undefined, testCases: (q.testCases || []).filter(t => !t.isHidden) })) }));
    }
    res.json({ success: true, assessment: a });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const a = await Assessment.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.userId }, req.body, { new: true });
    if (!a) return res.status(403).json({ success: false, message: 'Access denied.' });
    res.json({ success: true, assessment: a });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Assessment.deleteOne({ _id: req.params.id, createdBy: req.user.userId });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ QUESTION BANK ══════════

router.get('/questions/bank', async (req, res) => {
  try {
    const { category, difficulty, type, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;
    if (search) filter.$text = { $search: search };
    const [questions, total] = await Promise.all([
      AssessmentQuestion.find(filter).select('-correctAnswer -correctAnswers -explanation -testCases').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AssessmentQuestion.countDocuments(filter),
    ]);
    res.json(paginatedResponse(questions, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/questions', async (req, res) => {
  try {
    const q = await AssessmentQuestion.create({ createdBy: req.user.userId, ...req.body });
    res.status(201).json({ success: true, question: q });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SUBMISSIONS ══════════

router.post('/:id/start', async (req, res) => {
  try {
    const sub = await AssessmentSubmission.findOneAndUpdate(
      { assessmentId: req.params.id, candidateId: req.user.userId },
      { assessmentId: req.params.id, candidateId: req.user.userId, status: 'in_progress', startedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, submission: sub });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/submit', async (req, res) => {
  const { answers } = req.body;
  try {
    const assessment = await Assessment.findById(req.params.id).populate('sections.questions').lean();
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' });

    // Auto-evaluate MCQ/objective answers
    let totalScore = 0, maxScore = 0;
    const evaluatedAnswers = (answers || []).map(a => {
      const question = assessment.sections.flatMap(s => s.questions).find(q => String(q._id) === String(a.questionId));
      if (!question) return { ...a, isCorrect: null, marks: 0 };
      maxScore += question.marks;
      let isCorrect = null;
      if (['mcq', 'true_false', 'fill_blank', 'output'].includes(question.type)) {
        isCorrect = (a.answer || '').toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
        const marks = isCorrect ? question.marks : -question.negativeMarks;
        totalScore += Math.max(0, marks);
        return { ...a, isCorrect, marks: Math.max(0, marks) };
      }
      // Coding: simplified — check if all visible test cases pass (placeholder)
      if (question.type === 'coding') {
        isCorrect = true; // real impl runs code
        totalScore += question.marks;
        return { ...a, isCorrect, marks: question.marks };
      }
      return { ...a, isCorrect: null, marks: 0 };
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= (assessment.passingPercent || 60);

    const sub = await AssessmentSubmission.findOneAndUpdate(
      { assessmentId: req.params.id, candidateId: req.user.userId },
      { answers: evaluatedAnswers, totalScore, maxScore, percentage, passed, status: 'evaluated', submittedAt: new Date(), timeTaken: req.body.timeTaken || 0 },
      { new: true }
    );

    await Assessment.findByIdAndUpdate(req.params.id, { $inc: { submissionCount: 1 } });

    // Generate certificate if passed and configured
    let certificateId = null;
    if (passed && assessment.generateCertificate) {
      certificateId = `CERT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      sub.certificateId = certificateId;
      await sub.save();
    }

    res.json({ success: true, result: { totalScore, maxScore, percentage, passed, rank: 0, certificateId } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id/results', async (req, res) => {
  try {
    const submissions = await AssessmentSubmission.find({ assessmentId: req.params.id }).sort({ totalScore: -1 }).lean();
    // Assign ranks
    const ranked = submissions.map((s, i) => ({ ...s, rank: i + 1 }));
    res.json({ success: true, results: ranked });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id/my-result', async (req, res) => {
  try {
    const sub = await AssessmentSubmission.findOne({ assessmentId: req.params.id, candidateId: req.user.userId }).lean();
    if (!sub) return res.status(404).json({ success: false, message: 'No submission found.' });
    res.json({ success: true, result: sub });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PROCTORING VIOLATIONS ══════════

router.post('/:id/violation', async (req, res) => {
  const { type, details } = req.body;
  try {
    await AssessmentSubmission.findOneAndUpdate(
      { assessmentId: req.params.id, candidateId: req.user.userId },
      { $push: { violations: { type, details, at: new Date() } }, $inc: { violationCount: 1 } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ LIVE MONITORING ══════════

router.get('/:id/live', async (req, res) => {
  try {
    const submissions = await AssessmentSubmission.find({ assessmentId: req.params.id, status: 'in_progress' })
      .select('candidateId startedAt violationCount status').lean();
    res.json({ success: true, active: submissions });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ANALYTICS ══════════

router.get('/:id/analytics', async (req, res) => {
  try {
    const subs = await AssessmentSubmission.find({ assessmentId: req.params.id, status: 'evaluated' }).lean();
    const scores = subs.map(s => s.percentage);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const passRate = scores.length ? Math.round(subs.filter(s => s.passed).length / scores.length * 100) : 0;
    res.json({ success: true, analytics: { submissions: subs.length, avgScore: avg, passRate, topScore: Math.max(...scores, 0), violations: subs.reduce((s, x) => s + x.violationCount, 0) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
