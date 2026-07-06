/**
 * /api/plugins — Plugin Marketplace, installation, configuration, reviews, developer portal
 */
import express from 'express';
import Plugin from '../models/plugins/Plugin.js';
import InstalledPlugin from '../models/plugins/InstalledPlugin.js';
import PluginReview from '../models/plugins/PluginReview.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgMember } from '../middleware/orgPermissions.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const router = express.Router();

// ══════════ MARKETPLACE (public browsing) ══════════

router.get('/marketplace', async (req, res) => {
  try {
    const { category, search, license, sort } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (license) filter.license = license;
    if (search) filter.$text = { $search: search };
    const sortOpt = sort === 'rating' ? { rating: -1 } : sort === 'newest' ? { createdAt: -1 } : { downloads: -1 };
    const [plugins, total] = await Promise.all([
      Plugin.find(filter).sort(sortOpt).skip(skip).limit(limit).lean(),
      Plugin.countDocuments(filter),
    ]);
    res.json(paginatedResponse(plugins, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/marketplace/:key', async (req, res) => {
  try {
    const plugin = await Plugin.findOne({ key: req.params.key }).lean();
    if (!plugin) return res.status(404).json({ success: false, message: 'Plugin not found.' });
    const reviews = await PluginReview.find({ pluginId: plugin._id }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, plugin, reviews });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ INSTALLATION (org-level) ══════════

router.use(authenticateToken);

router.get('/installed/:orgId', requireOrgMember, async (req, res) => {
  try {
    const installed = await InstalledPlugin.find({ organizationId: req.params.orgId }).populate('pluginId').lean();
    res.json({ success: true, installed });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/install/:orgId', requireOrgMember, async (req, res) => {
  const { pluginKey } = req.body;
  try {
    const plugin = await Plugin.findOne({ key: pluginKey, status: 'published' });
    if (!plugin) return res.status(404).json({ success: false, message: 'Plugin not found.' });
    const installed = await InstalledPlugin.findOneAndUpdate(
      { organizationId: req.params.orgId, pluginKey },
      { organizationId: req.params.orgId, pluginId: plugin._id, pluginKey, version: plugin.version, isEnabled: true, installedBy: req.user.userId, permissions: plugin.permissions },
      { upsert: true, new: true }
    );
    await Plugin.findByIdAndUpdate(plugin._id, { $inc: { downloads: 1, activeInstalls: 1 } });
    res.json({ success: true, installed });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/uninstall/:orgId/:pluginKey', requireOrgMember, async (req, res) => {
  try {
    const result = await InstalledPlugin.findOneAndDelete({ organizationId: req.params.orgId, pluginKey: req.params.pluginKey });
    if (result) await Plugin.findByIdAndUpdate(result.pluginId, { $inc: { activeInstalls: -1 } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/toggle/:orgId/:pluginKey', requireOrgMember, async (req, res) => {
  try {
    const ip = await InstalledPlugin.findOne({ organizationId: req.params.orgId, pluginKey: req.params.pluginKey });
    if (!ip) return res.status(404).json({ success: false, message: 'Not installed.' });
    ip.isEnabled = !ip.isEnabled;
    await ip.save();
    res.json({ success: true, isEnabled: ip.isEnabled });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/settings/:orgId/:pluginKey', requireOrgMember, async (req, res) => {
  try {
    const ip = await InstalledPlugin.findOneAndUpdate(
      { organizationId: req.params.orgId, pluginKey: req.params.pluginKey },
      { settings: req.body.settings || {} },
      { new: true }
    );
    res.json({ success: true, settings: ip?.settings });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ REVIEWS ══════════

router.post('/reviews/:pluginId', async (req, res) => {
  try {
    const review = await PluginReview.findOneAndUpdate(
      { pluginId: req.params.pluginId, userId: req.user.userId },
      { pluginId: req.params.pluginId, userId: req.user.userId, ...req.body },
      { upsert: true, new: true }
    );
    // Update plugin rating
    const allReviews = await PluginReview.find({ pluginId: req.params.pluginId }).lean();
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await Plugin.findByIdAndUpdate(req.params.pluginId, { rating: Math.round(avg * 10) / 10, ratingCount: allReviews.length });
    res.json({ success: true, review });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ DEVELOPER PORTAL ══════════

router.post('/developer/submit', async (req, res) => {
  try {
    const plugin = await Plugin.create({ developerId: req.user.userId, status: 'review', ...req.body });
    res.status(201).json({ success: true, plugin });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/developer/my-plugins', async (req, res) => {
  try {
    const plugins = await Plugin.find({ developerId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, plugins });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/developer/:id', async (req, res) => {
  try {
    const plugin = await Plugin.findOneAndUpdate({ _id: req.params.id, developerId: req.user.userId }, req.body, { new: true });
    if (!plugin) return res.status(403).json({ success: false, message: 'Access denied.' });
    res.json({ success: true, plugin });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ADMIN ══════════

router.patch('/admin/approve/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const plugin = await Plugin.findByIdAndUpdate(req.params.id, { status: 'published', isVerified: true }, { new: true });
    res.json({ success: true, plugin });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/admin/reject/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const plugin = await Plugin.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    res.json({ success: true, plugin });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/admin/pending', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const plugins = await Plugin.find({ status: 'review' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, plugins });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
