/**
 * /api/global — Globalization, compliance, i18n, marketplace, enterprise workflows, privacy
 */
import express from 'express';
import Region from '../models/global/Region.js';
import Language from '../models/global/Language.js';
import Currency from '../models/global/Currency.js';
import CompliancePolicy from '../models/global/CompliancePolicy.js';
import PrivacyRequest from '../models/global/PrivacyRequest.js';
import EnterpriseWorkflow from '../models/global/EnterpriseWorkflow.js';
import MarketplaceExtension from '../models/global/MarketplaceExtension.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { requireOrgMember } from '../middleware/orgPermissions.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// REGIONS & LOCALIZATION (public)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/regions', async (req, res) => {
  try { res.json({ success: true, regions: await Region.find({ isActive: true }).lean() }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/languages', async (req, res) => {
  try { res.json({ success: true, languages: await Language.find({ isActive: true }).lean() }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/currencies', async (req, res) => {
  try { res.json({ success: true, currencies: await Currency.find({ isActive: true }).lean() }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE POLICIES (public view, admin manage)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/compliance', async (req, res) => {
  try { res.json({ success: true, policies: await CompliancePolicy.find({ isEnabled: true }).lean() }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/compliance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const policy = await CompliancePolicy.findOneAndUpdate({ key: req.body.key }, req.body, { upsert: true, new: true });
    res.json({ success: true, policy });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PRIVACY REQUESTS (GDPR right-to-delete, data export, etc.)
// ══════════════════════════════════════════════════════════════════════════════

router.post('/privacy/request', authenticateToken, async (req, res) => {
  try {
    const pr = await PrivacyRequest.create({ userId: req.user.userId, type: req.body.type, reason: req.body.reason || '' });
    res.status(201).json({ success: true, request: pr });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/privacy/requests', authenticateToken, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user.userId };
    const requests = await PrivacyRequest.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, requests });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/privacy/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const update = { status: req.body.status, processedBy: req.user.userId, processedAt: new Date() };
    if (req.body.dataUrl) update.dataUrl = req.body.dataUrl;
    const pr = await PrivacyRequest.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, request: pr });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE WORKFLOWS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/workflows/:orgId', authenticateToken, requireOrgMember, async (req, res) => {
  try {
    const workflows = await EnterpriseWorkflow.find({ organizationId: req.params.orgId }).lean();
    res.json({ success: true, workflows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/workflows/:orgId', authenticateToken, requireOrgMember, async (req, res) => {
  try {
    const wf = await EnterpriseWorkflow.create({ organizationId: req.params.orgId, ...req.body, createdBy: req.user.userId });
    res.status(201).json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/workflows/:orgId/:id', authenticateToken, requireOrgMember, async (req, res) => {
  try {
    const wf = await EnterpriseWorkflow.findOneAndUpdate({ _id: req.params.id, organizationId: req.params.orgId }, req.body, { new: true });
    res.json({ success: true, workflow: wf });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/workflows/:orgId/:id', authenticateToken, requireOrgMember, async (req, res) => {
  try {
    await EnterpriseWorkflow.deleteOne({ _id: req.params.id, organizationId: req.params.orgId });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE EXTENSIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/marketplace', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    const extensions = await MarketplaceExtension.find(filter).sort({ installCount: -1 }).lean();
    res.json({ success: true, extensions });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/marketplace', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ext = await MarketplaceExtension.findOneAndUpdate({ key: req.body.key }, req.body, { upsert: true, new: true });
    res.json({ success: true, extension: ext });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: Manage regions, languages, currencies
// ══════════════════════════════════════════════════════════════════════════════

router.post('/admin/regions', authenticateToken, requireAdmin, async (req, res) => {
  try { const r = await Region.findOneAndUpdate({ key: req.body.key }, req.body, { upsert: true, new: true }); res.json({ success: true, region: r }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/admin/languages', authenticateToken, requireAdmin, async (req, res) => {
  try { const l = await Language.findOneAndUpdate({ code: req.body.code }, req.body, { upsert: true, new: true }); res.json({ success: true, language: l }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/admin/currencies', authenticateToken, requireAdmin, async (req, res) => {
  try { const c = await Currency.findOneAndUpdate({ code: req.body.code }, req.body, { upsert: true, new: true }); res.json({ success: true, currency: c }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
