/**
 * /api/billing — Subscriptions, payments, invoices, coupons, usage, API keys, webhooks, support
 */
import express from 'express';
import crypto from 'crypto';
import Subscription from '../models/saas/Subscription.js';
import SubscriptionPlan from '../models/saas/SubscriptionPlan.js';
import Invoice from '../models/saas/Invoice.js';
import Payment from '../models/saas/Payment.js';
import Coupon from '../models/saas/Coupon.js';
import UsageMetric from '../models/saas/UsageMetric.js';
import ApiKey from '../models/saas/ApiKey.js';
import Webhook from '../models/saas/Webhook.js';
import SupportTicket from '../models/saas/SupportTicket.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgMember, requireOrgPermission } from '../middleware/orgPermissions.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION PLANS (public)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    res.json({ success: true, plans });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

router.get('/subscription/:orgId', requireOrgMember, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ organizationId: req.params.orgId }).populate('planId').lean();
    if (!sub) return res.json({ success: true, subscription: null });
    res.json({ success: true, subscription: sub });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/subscription/:orgId/subscribe', requireOrgMember, requireOrgPermission('manageBilling'), async (req, res) => {
  const { planKey, billingCycle, couponCode } = req.body;
  try {
    const plan = await SubscriptionPlan.findOne({ key: planKey, isActive: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const now = new Date();
    let endDate = new Date(now);
    if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > now) && (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses)) {
        discount = coupon.type === 'percentage' ? coupon.value : 0;
        coupon.usedCount++;
        await coupon.save();
      }
    }

    const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const finalAmount = Math.max(0, amount - (amount * discount / 100));

    const sub = await Subscription.findOneAndUpdate(
      { organizationId: req.params.orgId },
      {
        organizationId: req.params.orgId, planId: plan._id, planKey: plan.key,
        billingCycle, status: plan.trialDays > 0 ? 'trial' : 'active',
        startDate: now, endDate,
        trialEndsAt: plan.trialDays > 0 ? new Date(now.getTime() + plan.trialDays * 86400000) : null,
        amount: finalAmount, currency: plan.currency,
        couponCode: couponCode || null, discountPercent: discount,
        nextBillingAt: endDate,
      },
      { upsert: true, new: true }
    );

    // Generate invoice
    await Invoice.create({
      organizationId: req.params.orgId, subscriptionId: sub._id,
      invoiceNumber: `INV-${Date.now()}`, amount: finalAmount, tax: Math.round(finalAmount * 0.18),
      total: Math.round(finalAmount * 1.18), currency: plan.currency,
      status: finalAmount === 0 ? 'paid' : 'sent', issueDate: now,
      dueDate: new Date(now.getTime() + 7 * 86400000), planName: plan.name, billingCycle,
    });

    res.json({ success: true, subscription: sub });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/subscription/:orgId/cancel', requireOrgMember, requireOrgPermission('manageBilling'), async (req, res) => {
  try {
    await Subscription.findOneAndUpdate(
      { organizationId: req.params.orgId },
      { status: 'cancelled', cancelledAt: new Date() }
    );
    res.json({ success: true, message: 'Subscription cancelled. You retain access until the end of your billing period.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/invoices/:orgId', requireOrgMember, async (req, res) => {
  try {
    const invoices = await Invoice.find({ organizationId: req.params.orgId }).sort({ issueDate: -1 }).lean();
    res.json({ success: true, invoices });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/payments/:orgId', requireOrgMember, async (req, res) => {
  try {
    const payments = await Payment.find({ organizationId: req.params.orgId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, payments });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/payments/:orgId/record', requireOrgMember, requireOrgPermission('manageBilling'), async (req, res) => {
  try {
    const payment = await Payment.create({ organizationId: req.params.orgId, ...req.body, status: 'success', paidAt: new Date() });
    res.status(201).json({ success: true, payment });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// USAGE
// ══════════════════════════════════════════════════════════════════════════════

router.get('/usage/:orgId', requireOrgMember, async (req, res) => {
  try {
    const period = new Date().toISOString().slice(0, 7);
    let usage = await UsageMetric.findOne({ organizationId: req.params.orgId, period }).lean();
    if (!usage) usage = { recruiters: 0, activeJobs: 0, applications: 0, storageMb: 0, aiRequests: 0, emailsSent: 0, apiRequests: 0, messages: 0 };
    const sub = await Subscription.findOne({ organizationId: req.params.orgId }).populate('planId').lean();
    const limits = sub?.planId?.limits || {};
    res.json({ success: true, usage, limits, plan: sub?.planKey || 'free' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COUPONS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/coupons/validate', async (req, res) => {
  const { code } = req.body;
  try {
    const coupon = await Coupon.findOne({ code: (code || '').toUpperCase(), isActive: true }).lean();
    if (!coupon) return res.json({ success: true, valid: false });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.json({ success: true, valid: false, reason: 'expired' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return res.json({ success: true, valid: false, reason: 'max_uses' });
    res.json({ success: true, valid: true, coupon: { type: coupon.type, value: coupon.value, applicablePlans: coupon.applicablePlans } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// API KEYS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/api-keys/:orgId', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    const keys = await ApiKey.find({ organizationId: req.params.orgId }).select('-key').lean();
    res.json({ success: true, apiKeys: keys });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/api-keys/:orgId', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    const key = `tinclo_${crypto.randomBytes(24).toString('hex')}`;
    const apiKey = await ApiKey.create({ organizationId: req.params.orgId, key, name: req.body.name || 'API Key', createdBy: req.user.userId, scopes: req.body.scopes || ['read'] });
    res.status(201).json({ success: true, apiKey: { ...apiKey.toObject(), key } }); // show key only once
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/api-keys/:orgId/:keyId', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    await ApiKey.deleteOne({ _id: req.params.keyId, organizationId: req.params.orgId });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOKS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/webhooks/:orgId', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    const webhooks = await Webhook.find({ organizationId: req.params.orgId }).lean();
    res.json({ success: true, webhooks });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/webhooks/:orgId', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    const wh = await Webhook.create({ organizationId: req.params.orgId, ...req.body, secret: crypto.randomBytes(16).toString('hex'), createdBy: req.user.userId });
    res.status(201).json({ success: true, webhook: wh });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/webhooks/:orgId/:whId', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    await Webhook.deleteOne({ _id: req.params.whId, organizationId: req.params.orgId });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/support', async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, tickets });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/support', async (req, res) => {
  try {
    const ticket = await SupportTicket.create({ userId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, ticket });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/support/:id/reply', async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Not found.' });
    ticket.messages.push({ senderId: req.user.userId, content: req.body.content });
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// REVENUE ANALYTICS (admin only)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/revenue', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const [totalSubs, activeSubs, trialSubs, payments] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'trial' }),
      Payment.find({ status: 'success' }).lean(),
    ]);
    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
    const mrr = payments.filter(p => p.createdAt > new Date(Date.now() - 30 * 86400000)).reduce((s, p) => s + p.amount, 0);
    const planDist = await Subscription.aggregate([{ $group: { _id: '$planKey', count: { $sum: 1 } } }]);
    res.json({ success: true, revenue: { totalRevenue, mrr, arr: mrr * 12, totalSubscriptions: totalSubs, activeSubscriptions: activeSubs, trialSubscriptions: trialSubs, planDistribution: planDist } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
