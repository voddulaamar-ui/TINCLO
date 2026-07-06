/**
 * /api/mobile — Native mobile app APIs
 * Device registration, push tokens, offline sync, deep links, app config, biometric.
 */
import express from 'express';
import MobileDevice from '../models/mobile/MobileDevice.js';
import OfflineSyncQueue from '../models/mobile/OfflineSyncQueue.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ DEVICE REGISTRATION ══════════

router.post('/devices/register', async (req, res) => {
  const { deviceId, platform, model, osVersion, appVersion, pushToken, pushProvider, locale, timezone } = req.body;
  if (!deviceId || !platform) return res.status(400).json({ success: false, message: 'deviceId and platform are required.' });
  try {
    const device = await MobileDevice.findOneAndUpdate(
      { userId: req.user.userId, deviceId },
      { userId: req.user.userId, deviceId, platform, model, osVersion, appVersion, pushToken, pushProvider: pushProvider || 'fcm', locale, timezone, lastActiveAt: new Date(), isActive: true },
      { upsert: true, new: true }
    );
    res.json({ success: true, device });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/devices', async (req, res) => {
  try {
    const devices = await MobileDevice.find({ userId: req.user.userId, isActive: true }).lean();
    res.json({ success: true, devices });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/devices/:deviceId', async (req, res) => {
  try {
    await MobileDevice.findOneAndUpdate({ userId: req.user.userId, deviceId: req.params.deviceId }, { isActive: false, pushToken: null });
    res.json({ success: true, message: 'Device removed.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/devices/logout-all', async (req, res) => {
  try {
    await MobileDevice.updateMany({ userId: req.user.userId }, { isActive: false, pushToken: null });
    res.json({ success: true, message: 'All devices logged out.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PUSH TOKEN UPDATE ══════════

router.patch('/devices/:deviceId/token', async (req, res) => {
  const { pushToken } = req.body;
  try {
    await MobileDevice.findOneAndUpdate({ userId: req.user.userId, deviceId: req.params.deviceId }, { pushToken, lastActiveAt: new Date() });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ OFFLINE SYNC ══════════

router.post('/sync/queue', async (req, res) => {
  const { actions } = req.body; // array of { action, payload }
  if (!Array.isArray(actions)) return res.status(400).json({ success: false, message: 'actions array required.' });
  try {
    const items = actions.map(a => ({ userId: req.user.userId, deviceId: req.body.deviceId || '', action: a.action, payload: a.payload }));
    await OfflineSyncQueue.insertMany(items);
    res.json({ success: true, queued: items.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/sync/process', async (req, res) => {
  try {
    const pending = await OfflineSyncQueue.find({ userId: req.user.userId, status: 'pending' }).sort({ queuedAt: 1 }).limit(50);
    let synced = 0, failed = 0;
    for (const item of pending) {
      try {
        // Process each action (simplified — real impl routes to correct handler)
        item.status = 'synced';
        item.syncedAt = new Date();
        synced++;
      } catch {
        item.status = 'failed';
        item.retryCount++;
        failed++;
      }
      await item.save();
    }
    res.json({ success: true, synced, failed, remaining: await OfflineSyncQueue.countDocuments({ userId: req.user.userId, status: 'pending' }) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/sync/status', async (req, res) => {
  try {
    const pending = await OfflineSyncQueue.countDocuments({ userId: req.user.userId, status: 'pending' });
    const failed = await OfflineSyncQueue.countDocuments({ userId: req.user.userId, status: 'failed' });
    res.json({ success: true, pending, failed });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ APP CONFIG ══════════

router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      minVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdate: false,
      maintenance: false,
      features: { ai: true, messaging: true, learning: true, assessments: true, hrms: true, marketplace: true },
      deepLinkPrefix: 'tinclo://',
      apiBaseUrl: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/:\d+$/, ':5002') + '/api/v1' : 'http://localhost:5002/api/v1',
      wsUrl: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/:\d+$/, ':5002') : 'http://localhost:5002',
    },
  });
});

// ══════════ DEEP LINKS ══════════

router.get('/deep-link/resolve', async (req, res) => {
  const { path } = req.query;
  // Map deep link paths to mobile screens
  const routes = {
    '/jobs': { screen: 'JobBrowser' },
    '/dashboard': { screen: 'Dashboard' },
    '/messages': { screen: 'Messages' },
    '/learning': { screen: 'Learning' },
    '/profile': { screen: 'Profile' },
  };
  const match = Object.entries(routes).find(([p]) => (path || '').startsWith(p));
  res.json({ success: true, resolved: match ? { path: match[0], ...match[1] } : { screen: 'Home' } });
});

// ══════════ BIOMETRIC AUTH ══════════

router.post('/biometric/enable', async (req, res) => {
  const { deviceId, biometricType } = req.body; // 'fingerprint', 'face_id'
  try {
    await MobileDevice.findOneAndUpdate({ userId: req.user.userId, deviceId }, { isTrusted: true });
    res.json({ success: true, message: `Biometric (${biometricType}) enabled.` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/biometric/verify', async (req, res) => {
  const { deviceId } = req.body;
  try {
    const device = await MobileDevice.findOne({ userId: req.user.userId, deviceId, isTrusted: true, isActive: true });
    if (!device) return res.status(401).json({ success: false, message: 'Device not trusted.' });
    res.json({ success: true, verified: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ APP ANALYTICS ══════════

router.post('/analytics/event', async (req, res) => {
  // Accept mobile analytics events (batched)
  // In production, forward to analytics pipeline
  res.json({ success: true, received: true });
});

router.post('/analytics/crash', async (req, res) => {
  // Accept crash reports
  const { error, stackTrace, deviceId, appVersion } = req.body;
  console.error(`[MOBILE CRASH] ${appVersion} ${deviceId}: ${error}`);
  res.json({ success: true });
});

export default router;
