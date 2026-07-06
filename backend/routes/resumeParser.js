/**
 * /api/resume — Resume parsing and profile strength endpoints
 * 
 * POST /api/resume/parse         — Upload + parse a PDF resume, auto-fill profile
 * GET  /api/resume/strength      — Get profile strength score
 * GET  /api/resume/versions      — List all uploaded resumes
 * PATCH /api/resume/versions/:index/activate — Set active resume
 * DELETE /api/resume/versions/:index — Delete a resume version
 */
import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { parseResume, calculateProfileStrength } from '../services/resumeParser.js';
import User from '../models/User.js';

const router = express.Router();
router.use(authenticateToken);

// Multer — memory storage for parsing (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOC, and DOCX files are allowed.'), false);
  },
}).single('resume');

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/resume/parse — Upload, parse, and optionally auto-fill profile
// ══════════════════════════════════════════════════════════════════════════════
router.post('/parse', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No resume file provided.' });
    }

    // Parse PDF
    const parsed = await parseResume(req.file.buffer);

    // Auto-fill profile if requested
    const autoFill = req.body.autoFill !== 'false'; // default: true
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (autoFill) {
      // Only fill empty fields — never overwrite existing data
      if (!user.phone && parsed.phone)       user.phone = parsed.phone;
      if ((!user.skills || user.skills.length === 0) && parsed.skills.length > 0) user.skills = parsed.skills;
      if (!user.linkedin && parsed.linkedin) user.linkedin = parsed.linkedin;
      if (!user.github && parsed.github)     user.github = parsed.github;
      if ((!user.education || user.education.length === 0) && parsed.education.length > 0) {
        user.education = parsed.education;
      }
      if ((!user.projects || user.projects.length === 0) && parsed.projects.length > 0) {
        user.projects = parsed.projects;
      }
      if (!user.experienceYears && parsed.experience > 0) {
        user.experienceYears = parsed.experience;
      }
    }

    // Save resume version
    const resumeEntry = {
      url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      name: req.file.originalname,
      uploadedAt: new Date(),
      isActive: true,
      parsedData: parsed,
    };

    // Deactivate all previous resumes
    if (user.resumes) {
      user.resumes.forEach(r => { r.isActive = false; });
    } else {
      user.resumes = [];
    }
    user.resumes.push(resumeEntry);

    // Keep max 5 versions
    if (user.resumes.length > 5) {
      user.resumes = user.resumes.slice(-5);
    }

    // Update active resume URL
    user.resumeUrl = resumeEntry.url;
    user.resumeName = req.file.originalname;
    user.resumeUploadedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Resume parsed and profile updated successfully!',
      parsed,
      autoFilled: autoFill,
      profileStrength: calculateProfileStrength(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/resume/strength — Profile strength score
// ══════════════════════════════════════════════════════════════════════════════
router.get('/strength', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const strength = calculateProfileStrength(user);
    res.json({ success: true, ...strength });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/resume/versions — List all resume versions
// ══════════════════════════════════════════════════════════════════════════════
router.get('/versions', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId })
      .select('resumes resumeUrl resumeName resumeUploadedAt')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const versions = (user.resumes || []).map((r, i) => ({
      index: i,
      name: r.name,
      uploadedAt: r.uploadedAt,
      isActive: r.isActive,
      hasParseData: !!r.parsedData,
    }));

    res.json({ success: true, versions, activeResume: user.resumeName });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/resume/versions/:index/activate — Set active resume
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/versions/:index/activate', async (req, res) => {
  try {
    const idx = parseInt(req.params.index);
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (!user.resumes || !user.resumes[idx]) {
      return res.status(404).json({ success: false, message: 'Resume version not found.' });
    }

    user.resumes.forEach(r => { r.isActive = false; });
    user.resumes[idx].isActive = true;
    user.resumeUrl = user.resumes[idx].url;
    user.resumeName = user.resumes[idx].name;
    await user.save();

    res.json({ success: true, message: 'Active resume updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/resume/versions/:index — Delete a resume version
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/versions/:index', async (req, res) => {
  try {
    const idx = parseInt(req.params.index);
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (!user.resumes || !user.resumes[idx]) {
      return res.status(404).json({ success: false, message: 'Resume version not found.' });
    }

    const wasActive = user.resumes[idx].isActive;
    user.resumes.splice(idx, 1);

    // If deleted was active, activate the latest one
    if (wasActive && user.resumes.length > 0) {
      user.resumes[user.resumes.length - 1].isActive = true;
      user.resumeUrl = user.resumes[user.resumes.length - 1].url;
      user.resumeName = user.resumes[user.resumes.length - 1].name;
    } else if (user.resumes.length === 0) {
      user.resumeUrl = null;
      user.resumeName = null;
    }

    await user.save();
    res.json({ success: true, message: 'Resume version deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
