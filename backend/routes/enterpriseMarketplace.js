/**
 * /api/enterprise-marketplace — Enterprise Marketplace
 * HR modules, integrations, themes, AI agents, workflow packs, partner ecosystem.
 */
import express from 'express';
import MarketplaceItem from '../models/enterpriseMarketplace/MarketplaceItem.js';
import MarketplaceInstall from '../models/enterpriseMarketplace/MarketplaceInstall.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ══════════ PUBLIC: BROWSE ══════════

router.get('/items', async (req, res) => {
  const { category, industry, pricing, search, featured, limit } = req.query;
  try {
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (industry) filter.industries = new RegExp(industry, 'i');
    if (pricing) filter.pricing = pricing;
    if (featured === 'true') filter.isFeatured = true;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { tags: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
    const items = await MarketplaceItem.find(filter).select('-changelog').sort({ isFeatured: -1, installs: -1 }).limit(parseInt(limit) || 30).lean();
    res.json({ success: true, items });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/items/:id', async (req, res) => {
  try {
    const item = await MarketplaceItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Not found.' });
    await MarketplaceItem.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true, item });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/categories', async (req, res) => {
  const categories = [
    { id: 'hr_module', name: 'HR Modules', icon: '👥', count: 0 },
    { id: 'industry_solution', name: 'Industry Solutions', icon: '🏭', count: 0 },
    { id: 'integration', name: 'Integrations', icon: '🔗', count: 0 },
    { id: 'theme', name: 'Themes & Templates', icon: '🎨', count: 0 },
    { id: 'template', name: 'Templates', icon: '📋', count: 0 },
    { id: 'workflow_pack', name: 'Workflow Packs', icon: '⚙️', count: 0 },
    { id: 'ai_agent', name: 'AI Agents', icon: '🤖', count: 0 },
    { id: 'report', name: 'Reports & Dashboards', icon: '📊', count: 0 },
    { id: 'dashboard', name: 'Dashboards', icon: '📈', count: 0 },
  ];
  // Get counts
  for (const cat of categories) {
    cat.count = await MarketplaceItem.countDocuments({ category: cat.id, status: 'published' });
  }
  res.json({ success: true, categories });
});

// ══════════ AUTH REQUIRED ══════════
router.use(authenticateToken);

// ── Publish item (developer) ─────────────────────────────────────────────────
router.post('/items', async (req, res) => {
  try {
    const slug = req.body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${Date.now()}`;
    const item = await MarketplaceItem.create({ ...req.body, slug, publisherId: req.user.userId, publisherName: req.user.name || '', status: 'in_review' });
    res.status(201).json({ success: true, item });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/items/:id', async (req, res) => {
  try {
    const item = await MarketplaceItem.findOneAndUpdate({ _id: req.params.id, publisherId: req.user.userId }, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found or unauthorized.' });
    res.json({ success: true, item });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Install item ─────────────────────────────────────────────────────────────
router.post('/install', async (req, res) => {
  const { itemId } = req.body;
  try {
    const item = await MarketplaceItem.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    const install = await MarketplaceInstall.findOneAndUpdate(
      { itemId, orgId: req.user.orgId || req.user.userId },
      { itemId, orgId: req.user.orgId || req.user.userId, installedBy: req.user.userId, version: item.version, status: 'active', installedAt: new Date() },
      { upsert: true, new: true }
    );
    await MarketplaceItem.findByIdAndUpdate(itemId, { $inc: { installs: 1, activeInstalls: 1 } });
    res.json({ success: true, install });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Uninstall ────────────────────────────────────────────────────────────────
router.post('/uninstall', async (req, res) => {
  const { itemId } = req.body;
  try {
    await MarketplaceInstall.findOneAndUpdate({ itemId, orgId: req.user.orgId || req.user.userId }, { status: 'uninstalled' });
    await MarketplaceItem.findByIdAndUpdate(itemId, { $inc: { activeInstalls: -1 } });
    res.json({ success: true, message: 'Uninstalled.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── My installs ──────────────────────────────────────────────────────────────
router.get('/my-installs', async (req, res) => {
  try {
    const installs = await MarketplaceInstall.find({ orgId: req.user.orgId || req.user.userId, status: 'active' }).populate('itemId', 'name icon category version pricing').lean();
    res.json({ success: true, installs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── My published items (developer portal) ────────────────────────────────────
router.get('/my-items', async (req, res) => {
  try {
    const items = await MarketplaceItem.find({ publisherId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, items });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Revenue dashboard (developer) ────────────────────────────────────────────
router.get('/revenue', async (req, res) => {
  try {
    const items = await MarketplaceItem.find({ publisherId: req.user.userId }).select('name installs totalRevenue developerPayout rating').lean();
    const totalRevenue = items.reduce((s, i) => s + (i.developerPayout || 0), 0);
    const totalInstalls = items.reduce((s, i) => s + (i.installs || 0), 0);
    res.json({ success: true, revenue: { totalRevenue, totalInstalls, items } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Review item ──────────────────────────────────────────────────────────────
router.post('/items/:id/review', async (req, res) => {
  const { rating, comment } = req.body;
  try {
    const item = await MarketplaceItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found.' });
    // Simple rating update (in production, store individual reviews)
    const newCount = item.reviewCount + 1;
    const newRating = ((item.rating * item.reviewCount) + (rating || 5)) / newCount;
    await MarketplaceItem.findByIdAndUpdate(req.params.id, { rating: Math.round(newRating * 10) / 10, reviewCount: newCount });
    res.json({ success: true, message: 'Review submitted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
