import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, userId: user.userId, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email and password are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  if (password.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  if (!/[A-Z]/.test(password))
    return res.status(400).json({ message: 'Password must contain at least one uppercase letter.' });
  if (!/[0-9]/.test(password))
    return res.status(400).json({ message: 'Password must contain at least one number.' });

  // Only allow 'user' or 'recruiter' roles at registration — admins are set manually
  const assignedRole = role === 'recruiter' ? 'recruiter' : 'user';

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(400).json({ message: 'An account with this email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = `user-${email.split('@')[0]}-${Date.now()}`;

    const user = new User({
      userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone || '',
      role: assignedRole,
    });

    await user.save();
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user.userId, name: user.name, email: user.email, role: user.role },
      message: 'Account created successfully!',
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ message: 'An account with this email already exists.' });
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return res.status(400).json({ message: 'Please provide a valid email address.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password.' });

    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
      if (isMatch) {
        user.password = await bcrypt.hash(password, 12);
      }
    }

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password.' });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills || [],
        domain: user.domain || '',
        experienceYears: user.experienceYears || 0,
        preferredLocations: user.preferredLocations || [],
      },
      message: `Welcome back, ${user.name}!`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword)
    return res.status(400).json({ message: 'All fields are required.' });
  if (newPassword.length < 8)
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  if (!/[A-Z]/.test(newPassword))
    return res.status(400).json({ message: 'New password must contain at least one uppercase letter.' });
  if (!/[0-9]/.test(newPassword))
    return res.status(400).json({ message: 'New password must contain at least one number.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(currentPassword, user.password);
    } else {
      isMatch = user.password === currentPassword;
    }
    if (!isMatch)
      return res.status(401).json({ message: 'Current password is incorrect.' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/auth/update-profile  — basic fields (name/phone/location/bio)
router.put('/update-profile', authenticateToken, async (req, res) => {
  const { email, name, phone, location, bio } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required.' });
  if (!name || name.trim().length < 2)
    return res.status(400).json({ message: 'Name must be at least 2 characters.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.name     = name.trim();
    user.phone    = phone    || '';
    user.location = location || '';
    user.bio      = bio      || '';
    await user.save();

    res.json({
      message: 'Profile updated successfully!',
      user: { id: user.userId, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/auth/update-candidate-profile  — full Phase-1 candidate fields
router.put('/update-candidate-profile', authenticateToken, async (req, res) => {
  const {
    name, phone, location, bio,
    skills, domain, experienceYears, preferredLocations,
    expectedSalary, education, projects, linkedin, github,
    profilePicture, resumeUrl,
  } = req.body;

  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (name && name.trim().length >= 2) user.name = name.trim();
    if (phone    !== undefined) user.phone    = phone;
    if (location !== undefined) user.location = location;
    if (bio      !== undefined) user.bio      = bio;

    if (Array.isArray(skills))            user.skills            = skills;
    if (domain   !== undefined)           user.domain            = domain;
    if (experienceYears !== undefined)    user.experienceYears   = Number(experienceYears) || 0;
    if (Array.isArray(preferredLocations))user.preferredLocations= preferredLocations;
    if (expectedSalary !== undefined)     user.expectedSalary    = expectedSalary;
    if (Array.isArray(education))         user.education         = education;
    if (Array.isArray(projects))          user.projects          = projects;
    if (linkedin !== undefined)           user.linkedin          = linkedin;
    if (github   !== undefined)           user.github            = github;
    if (profilePicture !== undefined)     user.profilePicture    = profilePicture;
    if (resumeUrl !== undefined)          user.resumeUrl         = resumeUrl;

    await user.save();

    const u = user.toObject();
    delete u.password;
    res.json({ message: 'Profile updated successfully!', user: u });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me  — get current user's full profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
