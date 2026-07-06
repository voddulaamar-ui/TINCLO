/**
 * /api/uploads — File upload endpoints
 * 
 * POST /api/uploads/image         — Upload profile picture / company logo / banner
 * POST /api/uploads/resume        — Upload resume (PDF/DOC/DOCX)
 * DELETE /api/uploads/image/:publicId — Delete an uploaded image
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { uploadImage, uploadResume, handleUploadError } from '../middleware/upload.js';
import { cloudinary, isConfigured } from '../config/cloudinary.js';
import User from '../models/User.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/uploads/image — Upload an image (profile pic, company logo, banner)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/image', (req, res, next) => {
  uploadImage(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.', errorCode: 'NO_FILE' });
    }

    let url, publicId;

    if (isConfigured) {
      // Cloudinary storage — file is already uploaded, path contains the URL
      url = req.file.path;
      publicId = req.file.filename;
    } else {
      // Memory storage fallback — convert buffer to base64 data URL
      const b64 = req.file.buffer.toString('base64');
      url = `data:${req.file.mimetype};base64,${b64}`;
      publicId = `local-${Date.now()}`;
    }

    // Optionally update user's profile picture directly
    const { target } = req.body; // 'profilePicture' | 'companyLogo' | 'companyBanner'
    if (target === 'profilePicture') {
      await User.findOneAndUpdate({ userId: req.user.userId }, { profilePicture: url });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully!',
      url,
      publicId,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/uploads/resume — Upload a resume file
// ══════════════════════════════════════════════════════════════════════════════
router.post('/resume', (req, res, next) => {
  uploadResume(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No resume file provided.', errorCode: 'NO_FILE' });
    }

    let url, publicId;

    if (isConfigured) {
      url = req.file.path;
      publicId = req.file.filename;
    } else {
      const b64 = req.file.buffer.toString('base64');
      url = `data:${req.file.mimetype};base64,${b64}`;
      publicId = `local-resume-${Date.now()}`;
    }

    // Update user's resume URL
    await User.findOneAndUpdate(
      { userId: req.user.userId },
      {
        resumeUrl: url,
        resumeName: req.file.originalname,
        resumeUploadedAt: new Date(),
      }
    );

    res.json({
      success: true,
      message: 'Resume uploaded successfully!',
      url,
      publicId,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/uploads/image/:publicId — Delete an image from Cloudinary
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/image/:publicId', async (req, res) => {
  try {
    if (!isConfigured) {
      return res.json({ success: true, message: 'Image reference removed (no cloud storage configured).' });
    }

    const result = await cloudinary.uploader.destroy(req.params.publicId);
    res.json({
      success: true,
      message: result.result === 'ok' ? 'Image deleted successfully.' : 'Image not found or already deleted.',
      result: result.result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/uploads/resume — Delete user's resume
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/resume', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // If Cloudinary, try to delete from cloud
    if (isConfigured && user.resumeUrl && !user.resumeUrl.startsWith('data:')) {
      try {
        const parts = user.resumeUrl.split('/');
        const publicId = parts.slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      } catch { /* non-fatal */ }
    }

    user.resumeUrl = null;
    user.resumeName = null;
    user.resumeUploadedAt = null;
    await user.save();

    res.json({ success: true, message: 'Resume deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
