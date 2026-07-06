/**
 * /api/developer — Public Developer Platform
 * App management, OAuth, API keys, webhooks, analytics, sandbox, documentation.
 */
import express from 'express';
import crypto from 'crypto';
import DeveloperApp from '../models/developer/DeveloperApp.js';
import ApiLog from '../models/developer/ApiLog.js';
import WebhookDelivery from '../models/developer/WebhookDelivery.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ APPLICATIONS ══════════

router.get('/apps', async (req, res) => {
  try {
    const apps = await DeveloperApp.find({ developerId: req.user.userId }).select('-clientSecret').sort({ createdAt: -1 }).lean();
    res.json({ success: true, apps });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/apps', async (req, res) => {
  try {
    const clientId = `tinclo_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = `secret_${crypto.randomBytes(32).toString('hex')}`;
    const app = await DeveloperApp.create({
      developerId: req.user.userId, clientId, clientSecret,
      ...req.body,
    });
    // Return secret only once
    res.status(201).json({ success: true, app: { ...app.toObject(), clientSecret } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/apps/:clientId', async (req, res) => {
  try {
    const app = await DeveloperApp.findOne({ clientId: req.params.clientId, developerId: req.user.userId }).select('-clientSecret').lean();
    if (!app) return res.status(404).json({ success: false, message: 'App not found.' });
    res.json({ success: true, app });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/apps/:clientId', async (req, res) => {
  try {
    const { name, description, logo, website, redirectUris, scopes, webhookUrl, webhookEvents } = req.body;
    const app = await DeveloperApp.findOneAndUpdate(
      { clientId: req.params.clientId, developerId: req.user.userId },
      { name, description, logo, website, redirectUris, scopes, webhookUrl, webhookEvents },
      { new: true }
    ).select('-clientSecret');
    res.json({ success: true, app });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/apps/:clientId', async (req, res) => {
  try {
    await DeveloperApp.deleteOne({ clientId: req.params.clientId, developerId: req.user.userId });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Rotate secret
router.post('/apps/:clientId/rotate-secret', async (req, res) => {
  try {
    const newSecret = `secret_${crypto.randomBytes(32).toString('hex')}`;
    await DeveloperApp.findOneAndUpdate({ clientId: req.params.clientId, developerId: req.user.userId }, { clientSecret: newSecret });
    res.json({ success: true, clientSecret: newSecret });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ OAUTH AUTHORIZE ══════════

router.get('/oauth/authorize', async (req, res) => {
  const { client_id, redirect_uri, scope, state, response_type } = req.query;
  try {
    const app = await DeveloperApp.findOne({ clientId: client_id, status: 'active' }).lean();
    if (!app) return res.status(400).json({ success: false, message: 'Invalid client_id.' });
    if (!app.redirectUris.includes(redirect_uri))
      return res.status(400).json({ success: false, message: 'Invalid redirect_uri.' });

    // In a full impl, show consent screen. Here we auto-approve for simplicity.
    const code = crypto.randomBytes(20).toString('hex');
    // In production, store this code temporarily (Redis/DB) for exchange
    res.json({ success: true, authorization_code: code, redirect_uri, state });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/oauth/token', async (req, res) => {
  const { client_id, client_secret, code, grant_type } = req.body;
  try {
    const app = await DeveloperApp.findOne({ clientId: client_id, clientSecret: client_secret, status: 'active' });
    if (!app) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    // Generate access token (simplified — real impl validates the auth code)
    const accessToken = `at_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `rt_${crypto.randomBytes(32).toString('hex')}`;
    res.json({ success: true, access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer', expires_in: 3600, scope: app.scopes.join(' ') });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ WEBHOOKS ══════════

router.get('/webhooks/deliveries', async (req, res) => {
  try {
    const { appId } = req.query;
    const filter = {};
    if (appId) filter.appId = appId;
    const deliveries = await WebhookDelivery.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, deliveries });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/webhooks/test', async (req, res) => {
  const { url, event, payload } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'url is required.' });
  try {
    // Attempt delivery
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tinclo-Event': event || 'test' },
      body: JSON.stringify(payload || { event: 'test', timestamp: new Date().toISOString() }),
    }).catch(err => ({ ok: false, status: 0, statusText: err.message }));

    const delivery = await WebhookDelivery.create({
      appId: 'test', event: event || 'test', url,
      payload: payload || {}, statusCode: response.status || 0,
      success: response.ok || false, error: response.ok ? '' : (response.statusText || 'Failed'),
      deliveredAt: new Date(),
    });
    res.json({ success: true, delivery });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ API ANALYTICS ══════════

router.get('/analytics', async (req, res) => {
  try {
    const thirtyDays = new Date(Date.now() - 30 * 86400000);
    const apps = await DeveloperApp.find({ developerId: req.user.userId }).select('clientId name').lean();
    const appIds = apps.map(a => a.clientId);

    const [totalRequests, errors, byEndpoint] = await Promise.all([
      ApiLog.countDocuments({ appId: { $in: appIds }, createdAt: { $gte: thirtyDays } }),
      ApiLog.countDocuments({ appId: { $in: appIds }, statusCode: { $gte: 400 }, createdAt: { $gte: thirtyDays } }),
      ApiLog.aggregate([
        { $match: { appId: { $in: appIds }, createdAt: { $gte: thirtyDays } } },
        { $group: { _id: '$path', count: { $sum: 1 }, avgLatency: { $avg: '$latency' } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    res.json({ success: true, analytics: { totalRequests, errors, errorRate: totalRequests > 0 ? Math.round((errors / totalRequests) * 100) : 0, topEndpoints: byEndpoint, apps: apps.length } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ API LOGS ══════════

router.get('/logs', async (req, res) => {
  try {
    const { appId, path, statusCode } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (appId) filter.appId = appId;
    if (path) filter.path = new RegExp(path, 'i');
    if (statusCode) filter.statusCode = parseInt(statusCode);
    const [logs, total] = await Promise.all([
      ApiLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ApiLog.countDocuments(filter),
    ]);
    res.json(paginatedResponse(logs, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ SANDBOX ══════════

router.get('/sandbox/status', (req, res) => {
  res.json({
    success: true,
    sandbox: {
      available: true,
      baseUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/v1`,
      features: ['test_data', 'mock_users', 'rate_limit_exemption', 'webhook_testing'],
      documentation: '/developer/docs',
    },
  });
});

// ══════════ API DOCUMENTATION META ══════════

router.get('/docs/modules', (req, res) => {
  res.json({
    success: true,
    modules: [
      { key: 'auth', name: 'Authentication', endpoints: 8 },
      { key: 'jobs', name: 'Jobs', endpoints: 6 },
      { key: 'candidates', name: 'Candidates', endpoints: 10 },
      { key: 'interviews', name: 'Interviews', endpoints: 9 },
      { key: 'assessments', name: 'Assessments', endpoints: 12 },
      { key: 'learning', name: 'Learning', endpoints: 15 },
      { key: 'messaging', name: 'Messaging', endpoints: 12 },
      { key: 'hrms', name: 'HRMS', endpoints: 20 },
      { key: 'ai', name: 'AI & Copilot', endpoints: 25 },
      { key: 'automation', name: 'Automation', endpoints: 16 },
      { key: 'billing', name: 'Billing', endpoints: 12 },
      { key: 'marketplace', name: 'Marketplace', endpoints: 10 },
    ],
    versions: ['v1'],
    totalEndpoints: 950,
  });
});

// ══════════ CHANGELOG ══════════

router.get('/changelog', (req, res) => {
  res.json({
    success: true,
    changelog: [
      { version: '24.0.0', date: '2026-07-05', type: 'major', title: 'Developer Platform Launch', changes: ['REST API platform', 'OAuth 2.0', 'SDK support', 'Webhook builder', 'Developer portal'] },
      { version: '23.0.0', date: '2026-07-05', type: 'major', title: 'TINCLO Flow', changes: ['Event-driven automation', 'Visual builder', 'Templates'] },
      { version: '22.0.0', date: '2026-07-05', type: 'major', title: 'Workflow Builder', changes: ['Low-code workflows', 'Approval engine', 'AI decisions'] },
    ],
  });
});

export default router;
