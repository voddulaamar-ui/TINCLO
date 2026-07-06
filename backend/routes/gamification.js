/**
 * /api/gamification — XP, levels, achievements, badges, streaks, challenges, goals, leaderboards
 */
import express from 'express';
import gamificationEngine from '../services/gamificationEngine.js';
import UserLevel from '../models/gamification/UserLevel.js';
import XpHistory from '../models/gamification/XpHistory.js';
import Achievement from '../models/gamification/Achievement.js';
import UserAchievement from '../models/gamification/UserAchievement.js';
import Badge from '../models/gamification/Badge.js';
import UserBadge from '../models/gamification/UserBadge.js';
import Streak from '../models/gamification/Streak.js';
import Challenge from '../models/gamification/Challenge.js';
import UserChallenge from '../models/gamification/UserChallenge.js';
import UserGoal from '../models/gamification/UserGoal.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE & DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/profile', async (req, res) => {
  try {
    const profile = await gamificationEngine.getProfile(req.user.userId);
    const [achievements, badges, goals] = await Promise.all([
      UserAchievement.find({ userId: req.user.userId }).sort({ unlockedAt: -1 }).limit(20).lean(),
      UserBadge.find({ userId: req.user.userId }).sort({ earnedAt: -1 }).lean(),
      UserGoal.find({ userId: req.user.userId, isCompleted: false }).lean(),
    ]);
    res.json({ success: true, ...profile, achievements, badges, goals });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// XP HISTORY
// ══════════════════════════════════════════════════════════════════════════════

router.get('/xp-history', async (req, res) => {
  try {
    const history = await XpHistory.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, history });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// STREAKS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/streaks/checkin', async (req, res) => {
  const { type } = req.body;
  try {
    const result = await gamificationEngine.updateStreak(req.user.userId, type || 'login');
    // Also award daily login XP
    if (type === 'login' || !type) {
      await gamificationEngine.awardXp(req.user.userId, 'daily_login', 10, 'Daily login');
    }
    res.json({ success: true, ...result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/streaks', async (req, res) => {
  try {
    const streaks = await Streak.find({ userId: req.user.userId }).lean();
    res.json({ success: true, streaks });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CHALLENGES (daily/weekly/monthly)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/challenges', async (req, res) => {
  const { type } = req.query;
  try {
    const filter = { isActive: true };
    if (type) filter.type = type;
    const challenges = await Challenge.find(filter).sort({ type: 1, createdAt: -1 }).lean();
    // Attach user progress
    const withProgress = await Promise.all(challenges.map(async ch => {
      const uc = await UserChallenge.findOne({ userId: req.user.userId, challengeId: ch._id }).lean();
      return { ...ch, userProgress: uc?.progress || 0, isCompleted: uc?.isCompleted || false };
    }));
    res.json({ success: true, challenges: withProgress });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/achievements', async (req, res) => {
  try {
    const all = await Achievement.find({ isActive: true }).lean();
    const unlocked = await UserAchievement.find({ userId: req.user.userId }).lean();
    const unlockedKeys = new Set(unlocked.map(u => u.achievementKey));
    const result = all.map(a => ({ ...a, unlocked: unlockedKeys.has(a.key), unlockedAt: unlocked.find(u => u.achievementKey === a.key)?.unlockedAt }));
    res.json({ success: true, achievements: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// BADGES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/badges', async (req, res) => {
  try {
    const all = await Badge.find({ isActive: true }).lean();
    const earned = await UserBadge.find({ userId: req.user.userId }).lean();
    const earnedKeys = new Set(earned.map(b => b.badgeKey));
    const result = all.map(b => ({ ...b, earned: earnedKeys.has(b.key), earnedAt: earned.find(e => e.badgeKey === b.key)?.earnedAt }));
    res.json({ success: true, badges: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// GOALS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/goals', async (req, res) => {
  try {
    const goals = await UserGoal.find({ userId: req.user.userId }).sort({ isCompleted: 1, createdAt: -1 }).lean();
    res.json({ success: true, goals });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/goals', async (req, res) => {
  const { title, description, targetAction, targetCount, deadline } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });
  try {
    const goal = await UserGoal.create({ userId: req.user.userId, title, description, targetAction, targetCount: targetCount || 1, deadline });
    res.status(201).json({ success: true, goal });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/goals/:id', async (req, res) => {
  try {
    await UserGoal.deleteOne({ _id: req.params.id, userId: req.user.userId });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD (uses learning/Leaderboard model from Phase 9)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/leaderboard', async (req, res) => {
  try {
    const entries = await UserLevel.find().sort({ totalXp: -1 }).limit(50).lean();
    res.json({ success: true, leaderboard: entries });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: manage challenges, achievements, badges
// ══════════════════════════════════════════════════════════════════════════════

router.post('/admin/challenges', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const ch = await Challenge.create(req.body);
    res.status(201).json({ success: true, challenge: ch });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/admin/achievements', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const ach = await Achievement.create(req.body);
    res.status(201).json({ success: true, achievement: ach });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/admin/badges', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
  try {
    const badge = await Badge.create(req.body);
    res.status(201).json({ success: true, badge });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// XP CONFIG (public — show what actions give XP)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/xp-config', (req, res) => {
  res.json({ success: true, xpMap: gamificationEngine.XP_MAP, levels: gamificationEngine.LEVEL_THRESHOLDS });
});

export default router;
