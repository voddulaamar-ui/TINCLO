/**
 * /api/integrations — Third-party integration marketplace, connections, OAuth, sync, meetings
 */
import express from 'express';
import crypto from 'crypto';
import IntegrationProvider from '../models/integrations/IntegrationProvider.js';
import ConnectedAccount from '../models/integrations/ConnectedAccount.js';
import SyncLog from '../models/integrations/SyncLog.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE — Browse available integrations
// ══════════════════════════════════════════════════════════════════════════════

router.get('/marketplace', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
    const providers = await IntegrationProvider.find(filter).sort({ category: 1, name: 1 }).lean();
    // Attach connection status for current user
    const connections = await ConnectedAccount.find({ userId: req.user.userId, status: 'active' }).select('providerKey').lean();
    const connectedKeys = new Set(connections.map(c => c.providerKey));
    const result = providers.map(p => ({ ...p, connected: connectedKeys.has(p.key) }));
    res.json({ success: true, providers: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/marketplace/:key', async (req, res) => {
  try {
    const provider = await IntegrationProvider.findOne({ key: req.params.key }).lean();
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });
    const connection = await ConnectedAccount.findOne({ userId: req.user.userId, providerKey: req.params.key }).lean();
    res.json({ success: true, provider, connection });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTIONS — Connect/disconnect integrations
// ══════════════════════════════════════════════════════════════════════════════

router.get('/connections', async (req, res) => {
  try {
    const connections = await ConnectedAccount.find({ userId: req.user.userId }).lean();
    res.json({ success: true, connections });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Connect — store OAuth tokens or API key
router.post('/connections', async (req, res) => {
  const { providerKey, accessToken, refreshToken, externalId, externalEmail, externalName, scopes, settings, organizationId } = req.body;
  if (!providerKey) return res.status(400).json({ success: false, message: 'providerKey is required.' });
  try {
    const conn = await ConnectedAccount.findOneAndUpdate(
      { userId: req.user.userId, providerKey },
      {
        userId: req.user.userId, providerKey, organizationId,
        accessToken: accessToken || '', refreshToken: refreshToken || '',
        externalId, externalEmail, externalName, scopes: scopes || [],
        settings: settings || {}, status: 'active', isEnabled: true,
        lastSyncAt: new Date(),
      },
      { upsert: true, new: true }
    );
    await SyncLog.create({ userId: req.user.userId, providerKey, action: 'connect', status: 'success', direction: 'inbound' });
    res.json({ success: true, connection: conn });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Disconnect
router.delete('/connections/:providerKey', async (req, res) => {
  try {
    await ConnectedAccount.findOneAndUpdate(
      { userId: req.user.userId, providerKey: req.params.providerKey },
      { status: 'revoked', isEnabled: false, accessToken: '', refreshToken: '' }
    );
    await SyncLog.create({ userId: req.user.userId, providerKey: req.params.providerKey, action: 'disconnect', status: 'success', direction: 'outbound' });
    res.json({ success: true, message: 'Disconnected.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Update settings
router.patch('/connections/:providerKey/settings', async (req, res) => {
  try {
    const conn = await ConnectedAccount.findOneAndUpdate(
      { userId: req.user.userId, providerKey: req.params.providerKey },
      { settings: req.body.settings || {}, syncFrequency: req.body.syncFrequency || 'manual' },
      { new: true }
    );
    res.json({ success: true, connection: conn });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// OAUTH FLOW — Generate auth URL + handle callback
// ══════════════════════════════════════════════════════════════════════════════

router.get('/oauth/:providerKey/url', async (req, res) => {
  try {
    const provider = await IntegrationProvider.findOne({ key: req.params.providerKey }).lean();
    if (!provider || !provider.oauthUrl) return res.status(404).json({ success: false, message: 'OAuth not configured for this provider.' });
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations/callback/${req.params.providerKey}`;
    const url = `${provider.oauthUrl}?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(provider.requiredScopes.join(' '))}`;
    res.json({ success: true, url, state });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SYNC — Trigger manual sync
// ══════════════════════════════════════════════════════════════════════════════

router.post('/sync/:providerKey', async (req, res) => {
  try {
    const conn = await ConnectedAccount.findOne({ userId: req.user.userId, providerKey: req.params.providerKey, status: 'active' });
    if (!conn) return res.status(404).json({ success: false, message: 'No active connection found.' });
    // Simulate sync (real implementation would call provider APIs)
    conn.lastSyncAt = new Date();
    await conn.save();
    await SyncLog.create({ userId: req.user.userId, providerKey: req.params.providerKey, action: 'manual_sync', status: 'success', direction: 'inbound', recordsProcessed: 0 });
    res.json({ success: true, message: 'Sync completed.', lastSyncAt: conn.lastSyncAt });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR — Create/list calendar events
// ══════════════════════════════════════════════════════════════════════════════

router.post('/calendar/create-event', async (req, res) => {
  const { title, startTime, endTime, description, attendees, provider, meetingLink } = req.body;
  try {
    // Store locally (real impl would push to Google Calendar / Outlook API)
    const event = {
      id: crypto.randomBytes(8).toString('hex'),
      title, startTime, endTime, description, attendees, meetingLink,
      provider: provider || 'internal',
      createdBy: req.user.userId,
      createdAt: new Date(),
    };
    await SyncLog.create({ userId: req.user.userId, providerKey: provider || 'internal', action: 'create_calendar_event', status: 'success', direction: 'outbound', details: event });
    res.json({ success: true, event });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// MEETINGS — Create video meeting links
// ══════════════════════════════════════════════════════════════════════════════

router.post('/meetings/create', async (req, res) => {
  const { provider, title, startTime, duration, participants } = req.body;
  try {
    // Generate meeting link (real impl would call Zoom/Meet/Teams API)
    const meetingId = crypto.randomBytes(6).toString('hex');
    const links = {
      zoom:       `https://zoom.us/j/${meetingId}`,
      google_meet:`https://meet.google.com/${meetingId}`,
      teams:      `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
      jitsi:      `https://meet.jit.si/tinclo-${meetingId}`,
    };
    const link = links[provider] || links.jitsi;
    await SyncLog.create({ userId: req.user.userId, providerKey: provider || 'jitsi', action: 'create_meeting', status: 'success', direction: 'outbound', details: { meetingId, link, title } });
    res.json({ success: true, meeting: { id: meetingId, link, title, startTime, duration, participants, provider: provider || 'jitsi' } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LOGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/logs', async (req, res) => {
  try {
    const { providerKey } = req.query;
    const filter = { userId: req.user.userId };
    if (providerKey) filter.providerKey = providerKey;
    const logs = await SyncLog.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, logs });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Manage providers
// ══════════════════════════════════════════════════════════════════════════════

router.post('/admin/providers', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const provider = await IntegrationProvider.findOneAndUpdate(
      { key: req.body.key },
      req.body,
      { upsert: true, new: true }
    );
    res.json({ success: true, provider });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/admin/stats', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const [totalProviders, totalConnections, activeConnections, recentLogs] = await Promise.all([
      IntegrationProvider.countDocuments({ isActive: true }),
      ConnectedAccount.countDocuments(),
      ConnectedAccount.countDocuments({ status: 'active' }),
      SyncLog.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const byProvider = await ConnectedAccount.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$providerKey', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, stats: { totalProviders, totalConnections, activeConnections, byProvider, recentLogs } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
