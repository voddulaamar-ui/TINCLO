/**
 * /api/push — Push notification subscription management + notification preferences
 */
import express from 'express';
import PushSubscription from '../models/PushSubscription.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ── Subscribe to push notifications ──────────────────────────────────────────
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys, deviceType, browser, os } = req.body;
  if (!endpoint) return res.status(400).json({ success: false, message: 'endpoint is required.' });

  try {
    const sub = await PushSubscription.findOneAndUpdate(
      { userId: req.user.userId, endpoint },
      { userId: req.user.userId, endpoint, keys: keys || {}, deviceType: deviceType || 'web', browser, os, isActive: true },
      { upsert: true, new: true }
    );
    res.json({ success: true, subscription: sub });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ── Unsubscribe ──────────────────────────────────────────────────────────────
router.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  try {
    await PushSubscription.deleteOne({ userId: req.user.userId, endpoint });
    res.json({ success: true, message: 'Unsubscribed.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ── Get notification preferences ─────────────────────────────────────────────
router.get('/preferences', async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ userId: req.user.userId }).lean();
    if (!prefs) prefs = { pushEnabled: true, emailEnabled: true, jobNotifications: true, messageNotifications: true, interviewNotifications: true, offerNotifications: true, recruiterActivity: true, announcements: true, marketing: false };
    res.json({ success: true, preferences: prefs });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ── Update notification preferences ──────────────────────────────────────────
router.put('/preferences', async (req, res) => {
  try {
    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId: req.user.userId },
      { userId: req.user.userId, ...req.body },
      { upsert: true, new: true }
    );
    res.json({ success: true, preferences: prefs });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ── Get user's registered devices ────────────────────────────────────────────
router.get('/devices', async (req, res) => {
  try {
    const devices = await PushSubscription.find({ userId: req.user.userId, isActive: true })
      .select('deviceType browser os createdAt').lean();
    res.json({ success: true, devices });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
