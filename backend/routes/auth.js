import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateSignup, validateLogin, validateForgotPassword, validateResetPassword } from '../middleware/validate.js';

const router = express.Router();

const JWT_SECRET     = process.env.JWT_SECRET || 'tinclo-secret-key';
const JWT_EXPIRES    = process.env.JWT_EXPIRES_IN || '7d';
const FRONTEND_URL   = process.env.FRONTEND_URL || 'http://localhost:5173';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS       = 15 * 60 * 1000; // 15 minutes

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, userId: user.userId, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

// ── Helper: send email (uses existing emailService if available) ─────────────
const sendEmail = async (to, subject, html) => {
  try {
    const { default: emailService } = await import('../services/emailService.js');
    if (emailService?.sendEmail) {
      await emailService.sendEmail({ to, subject, html });
    } else if (emailService?.send) {
      await emailService.send({ to, subject, html });
    }
  } catch (err) {
    console.warn('[AUTH] Email send failed (non-fatal):', err.message);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ══════════════════════════════════════════════════════════════════════════════
router.post('/register', validateSignup, async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  const assignedRole = role === 'recruiter' ? 'recruiter' : 'user';

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(400).json({ success: false, message: 'An account with this email already exists.', errorCode: 'DUPLICATE_EMAIL' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = `user-${email.split('@')[0]}-${Date.now()}`;

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = new User({
      userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone || '',
      role: assignedRole,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    await user.save();

    // Send verification email (non-blocking)
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    sendEmail(user.email, 'Verify your TINCLO account', `
      <h2>Welcome to TINCLO, ${user.name}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create this account, ignore this email.</p>
    `);

    // Still issue token (allow login without verification for now — soft enforcement)
    const token = generateToken(user);
    res.status(201).json({
      success: true,
      token,
      user: { id: user.userId, name: user.name, email: user.email, role: user.role, isEmailVerified: false },
      message: 'Account created! Please check your email to verify your account.',
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: 'An account with this email already exists.', errorCode: 'DUPLICATE_EMAIL' });
    res.status(500).json({ success: false, message: error.message, errorCode: 'SERVER_ERROR' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/verify-email
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify-email', async (req, res) => {
  const { token, email } = req.body;
  if (!token || !email)
    return res.status(400).json({ success: false, message: 'Token and email are required.' });

  try {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.', errorCode: 'INVALID_TOKEN' });

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/resend-verification
// ══════════════════════════════════════════════════════════════════════════════
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, message: 'Email is required.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.isEmailVerified) return res.json({ success: true, message: 'Email is already verified.' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    sendEmail(user.email, 'Verify your TINCLO account', `
      <h2>Hi ${user.name},</h2>
      <p>Click below to verify your email:</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `);

    res.json({ success: true, message: 'Verification email resent. Check your inbox.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login — with brute force protection
// ══════════════════════════════════════════════════════════════════════════════
router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid email or password.', errorCode: 'INVALID_CREDENTIALS' });

    // ── Brute force lockout check ──────────────────────────────────────────
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minsLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${minsLeft} minutes.`,
        errorCode: 'ACCOUNT_LOCKED',
      });
    }

    // ── Password comparison ────────────────────────────────────────────────
    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
      if (isMatch) user.password = await bcrypt.hash(password, 12);
    }

    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        await user.save();
        return res.status(423).json({
          success: false,
          message: `Too many failed attempts. Account locked for 15 minutes.`,
          errorCode: 'ACCOUNT_LOCKED',
        });
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid email or password.', errorCode: 'INVALID_CREDENTIALS' });
    }

    // ── Successful login — reset lockout ───────────────────────────────────
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.userId, name: user.name, email: user.email, role: user.role,
        isEmailVerified: user.isEmailVerified,
        skills: user.skills || [], domain: user.domain || '',
        experienceYears: user.experienceYears || 0, preferredLocations: user.preferredLocations || [],
      },
      message: `Welcome back, ${user.name}!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, errorCode: 'SERVER_ERROR' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ══════════════════════════════════════════════════════════════════════════════
router.post('/forgot-password', validateForgotPassword, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond success to prevent email enumeration
    if (!user) return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    sendEmail(user.email, 'Reset your TINCLO password', `
      <h2>Password Reset Request</h2>
      <p>Hi ${user.name}, click below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `);

    res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ══════════════════════════════════════════════════════════════════════════════
router.post('/reset-password', validateResetPassword, async (req, res) => {
  const { token, email, newPassword } = req.body;

  try {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.', errorCode: 'INVALID_TOKEN' });

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/change-password
// ══════════════════════════════════════════════════════════════════════════════
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  if (newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword))
    return res.status(400).json({ success: false, message: 'Password must contain uppercase, lowercase, number, and special character.' });

  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/auth/update-profile
// ══════════════════════════════════════════════════════════════════════════════
router.put('/update-profile', authenticateToken, async (req, res) => {
  const { name, phone, location, bio } = req.body;

  if (!name || name.trim().length < 2)
    return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });

  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.name     = name.trim();
    user.phone    = phone    || '';
    user.location = location || '';
    user.bio      = bio      || '';
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: { id: user.userId, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/auth/update-candidate-profile
// ══════════════════════════════════════════════════════════════════════════════
router.put('/update-candidate-profile', authenticateToken, async (req, res) => {
  const {
    name, phone, location, bio, skills, domain, experienceYears,
    preferredLocations, expectedSalary, education, projects,
    linkedin, github, profilePicture, resumeUrl,
  } = req.body;

  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (name && name.trim().length >= 2) user.name = name.trim();
    if (phone    !== undefined) user.phone    = phone;
    if (location !== undefined) user.location = location;
    if (bio      !== undefined) user.bio      = bio;
    if (Array.isArray(skills))             user.skills            = skills;
    if (domain   !== undefined)            user.domain            = domain;
    if (experienceYears !== undefined)     user.experienceYears   = Number(experienceYears) || 0;
    if (Array.isArray(preferredLocations)) user.preferredLocations= preferredLocations;
    if (expectedSalary !== undefined)      user.expectedSalary    = expectedSalary;
    if (Array.isArray(education))          user.education         = education;
    if (Array.isArray(projects))           user.projects          = projects;
    if (linkedin !== undefined)            user.linkedin          = linkedin;
    if (github   !== undefined)            user.github            = github;
    if (profilePicture !== undefined)      user.profilePicture    = profilePicture;
    if (resumeUrl !== undefined)           user.resumeUrl         = resumeUrl;

    await user.save();
    const u = user.toObject();
    delete u.password;
    res.json({ success: true, message: 'Profile updated successfully!', user: u });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me
// ══════════════════════════════════════════════════════════════════════════════
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('-password -resetPasswordToken -emailVerificationToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
