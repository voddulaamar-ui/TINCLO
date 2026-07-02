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
  const { name, email, password, phone } = req.body;

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
      role: 'user',
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

    // Support both bcrypt hashed and plain text passwords (migration)
    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
      // Upgrade to hashed on successful login
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
      user: { id: user.userId, name: user.name, email: user.email, role: user.role },
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

// PUT /api/auth/update-profile
router.put('/update-profile', authenticateToken, async (req, res) => {
  const { email, name, phone, location, bio } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required.' });
  if (!name || name.trim().length < 2)
    return res.status(400).json({ message: 'Name must be at least 2 characters.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.name = name.trim();
    user.phone = phone || '';
    user.location = location || '';
    user.bio = bio || '';
    await user.save();

    res.json({
      message: 'Profile updated successfully!',
      user: { id: user.userId, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
