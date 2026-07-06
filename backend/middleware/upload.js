/**
 * File upload middleware using Multer + Cloudinary.
 * Provides separate uploaders for images and resumes with strict validation.
 */
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary, isConfigured } from '../config/cloudinary.js';

// ── Allowed file types ───────────────────────────────────────────────────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_IMAGE_SIZE  = 5 * 1024 * 1024;  // 5 MB
const MAX_RESUME_SIZE = 5 * 1024 * 1024;  // 5 MB

// ── File filter factories ────────────────────────────────────────────────────
const imageFilter = (req, file, cb) => {
  if (IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed.'), false);
  }
};

const resumeFilter = (req, file, cb) => {
  if (RESUME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed.'), false);
  }
};

// ── Storage configuration ────────────────────────────────────────────────────
let imageStorage, resumeStorage;

if (isConfigured) {
  imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'tinclo/images',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    },
  });

  resumeStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'tinclo/resumes',
      resource_type: 'raw',
      allowed_formats: ['pdf', 'doc', 'docx'],
    },
  });
} else {
  // Fallback: memory storage (file available as buffer in req.file.buffer)
  imageStorage  = multer.memoryStorage();
  resumeStorage = multer.memoryStorage();
}

// ── Multer instances ─────────────────────────────────────────────────────────

/** Upload a single image (field name: 'image') */
export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
}).single('image');

/** Upload a single resume (field name: 'resume') */
export const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFilter,
  limits: { fileSize: MAX_RESUME_SIZE },
}).single('resume');

// ── Error wrapper — converts Multer errors to JSON responses ─────────────────
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5 MB.', errorCode: 'FILE_TOO_LARGE' });
    }
    return res.status(400).json({ success: false, message: err.message, errorCode: 'UPLOAD_ERROR' });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message, errorCode: 'UPLOAD_ERROR' });
  }
  next();
};
