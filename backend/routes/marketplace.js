/**
 * /api/marketplace — Talent Marketplace (freelance, gig, internships, mentors, consulting, wallet)
 */
import express from 'express';
import FreelancerProfile from '../models/marketplace/FreelancerProfile.js';
import MarketplaceProject from '../models/marketplace/Project.js';
import Proposal from '../models/marketplace/Proposal.js';
import Contract from '../models/marketplace/Contract.js';
import Wallet from '../models/marketplace/Wallet.js';
import MarketplaceReview from '../models/marketplace/MarketplaceReview.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ FREELANCER PROFILES ══════════

router.get('/freelancers', async (req, res) => {
  try {
    const { skills, category, availability, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (skills) filter.skills = { $in: skills.split(',').map(s => new RegExp(s.trim(), 'i')) };
    if (category) filter.categories = category;
    if (availability) filter.availability = availability;
    if (search) filter.$text = { $search: search };
    const [freelancers, total] = await Promise.all([
      FreelancerProfile.find(filter).sort({ rating: -1 }).skip(skip).limit(limit).lean(),
      FreelancerProfile.countDocuments(filter),
    ]);
    res.json(paginatedResponse(freelancers, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/freelancers/me', async (req, res) => {
  try {
    let profile = await FreelancerProfile.findOne({ userId: req.user.userId }).lean();
    if (!profile) profile = null;
    res.json({ success: true, profile });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/freelancers/me', async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { userId: req.user.userId, ...req.body },
      { upsert: true, new: true }
    );
    res.json({ success: true, profile });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PROJECTS ══════════

router.get('/projects', async (req, res) => {
  try {
    const { category, status, projectType, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { visibility: 'public' };
    if (category) filter.category = category;
    if (status) filter.status = status; else filter.status = 'open';
    if (projectType) filter.projectType = projectType;
    if (search) filter.$text = { $search: search };
    const [projects, total] = await Promise.all([
      MarketplaceProject.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MarketplaceProject.countDocuments(filter),
    ]);
    res.json(paginatedResponse(projects, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/projects', async (req, res) => {
  try {
    const project = await MarketplaceProject.create({ clientId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, project });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = await MarketplaceProject.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, project });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/projects/:id/award', async (req, res) => {
  const { freelancerId } = req.body;
  try {
    const project = await MarketplaceProject.findById(req.params.id);
    if (!project || project.clientId !== req.user.userId) return res.status(403).json({ success: false, message: 'Access denied.' });
    project.awardedTo = freelancerId; project.status = 'in_progress';
    await project.save();
    await Proposal.findOneAndUpdate({ projectId: project._id, freelancerId }, { status: 'accepted' });
    res.json({ success: true, project });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/projects/:id/complete', async (req, res) => {
  try {
    await MarketplaceProject.findByIdAndUpdate(req.params.id, { status: 'completed' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PROPOSALS ══════════

router.get('/projects/:id/proposals', async (req, res) => {
  try {
    const proposals = await Proposal.find({ projectId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, proposals });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/projects/:id/proposals', async (req, res) => {
  try {
    const proposal = await Proposal.create({ projectId: req.params.id, freelancerId: req.user.userId, ...req.body });
    await MarketplaceProject.findByIdAndUpdate(req.params.id, { $inc: { proposalCount: 1 } });
    res.status(201).json({ success: true, proposal });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Already submitted.' });
    res.status(500).json({ success: false, message: e.message });
  }
});

// ══════════ CONTRACTS ══════════

router.get('/contracts', async (req, res) => {
  try {
    const contracts = await Contract.find({ $or: [{ clientId: req.user.userId }, { freelancerId: req.user.userId }] }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, contracts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/contracts', async (req, res) => {
  try {
    const contract = await Contract.create({ clientId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, contract });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/contracts/:id/sign', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Not found.' });
    if (contract.clientId === req.user.userId) contract.signedByClient = true;
    if (contract.freelancerId === req.user.userId) contract.signedByFreelancer = true;
    if (contract.signedByClient && contract.signedByFreelancer) { contract.status = 'signed'; contract.signedAt = new Date(); }
    await contract.save();
    res.json({ success: true, contract });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ WALLET ══════════

router.get('/wallet', async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.userId }).lean();
    if (!wallet) wallet = { balance: 0, escrowHeld: 0, totalEarned: 0, totalSpent: 0, transactions: [] };
    res.json({ success: true, wallet });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/wallet/deposit', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount.' });
  try {
    const wallet = await Wallet.findOneAndUpdate(
      { userId: req.user.userId },
      { $inc: { balance: amount }, $push: { transactions: { type: 'deposit', amount, description: 'Wallet deposit' } }, userId: req.user.userId },
      { upsert: true, new: true }
    );
    res.json({ success: true, balance: wallet.balance });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/wallet/withdraw', async (req, res) => {
  const { amount } = req.body;
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet || wallet.balance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance.' });
    wallet.balance -= amount;
    wallet.transactions.push({ type: 'withdrawal', amount: -amount, description: 'Withdrawal' });
    await wallet.save();
    res.json({ success: true, balance: wallet.balance });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ REVIEWS ══════════

router.post('/reviews', async (req, res) => {
  try {
    const review = await MarketplaceReview.create({ reviewerId: req.user.userId, ...req.body });
    // Update freelancer rating
    const allReviews = await MarketplaceReview.find({ revieweeId: req.body.revieweeId }).lean();
    const avgRating = allReviews.reduce((s, r) => s + r.ratings.overall, 0) / allReviews.length;
    await FreelancerProfile.findOneAndUpdate({ userId: req.body.revieweeId }, { rating: Math.round(avgRating * 10) / 10, ratingCount: allReviews.length });
    res.status(201).json({ success: true, review });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/reviews/:userId', async (req, res) => {
  try {
    const reviews = await MarketplaceReview.find({ revieweeId: req.params.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, reviews });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ MY PROJECTS (as client or freelancer) ══════════

router.get('/my-projects', async (req, res) => {
  try {
    const projects = await MarketplaceProject.find({ $or: [{ clientId: req.user.userId }, { awardedTo: req.user.userId }] }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, projects });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
