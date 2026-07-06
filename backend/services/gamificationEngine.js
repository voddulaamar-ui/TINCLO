/**
 * Gamification Engine — awards XP, checks level-ups, updates streaks, triggers achievements.
 * 
 * Usage:
 *   import gamification from '../services/gamificationEngine.js';
 *   await gamification.awardXp(userId, 'apply_job', 20, 'Applied to Frontend Dev at Google');
 */
import UserLevel from '../models/gamification/UserLevel.js';
import XpHistory from '../models/gamification/XpHistory.js';
import Streak from '../models/gamification/Streak.js';
import UserChallenge from '../models/gamification/UserChallenge.js';
import Challenge from '../models/gamification/Challenge.js';

// ── Level thresholds ─────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [
  0, 200, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000,
  20000, 26000, 33000, 41000, 50000, 60000, 72000, 85000, 100000,
];

const LEVEL_TITLES = [
  'Newcomer', 'Explorer', 'Learner', 'Achiever', 'Professional',
  'Expert', 'Master', 'Champion', 'Legend', 'Elite',
];

function getLevelForXp(totalXp) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 5000;
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    currentLevelXp: totalXp - currentThreshold,
    xpToNextLevel: nextThreshold - currentThreshold,
  };
}

// ── XP values per action ─────────────────────────────────────────────────────
const XP_MAP = {
  profile_complete:     100,
  resume_upload:        50,
  swipe_right:          5,
  save_job:             5,
  apply_job:            20,
  complete_course:      100,
  pass_quiz:            50,
  complete_challenge:   75,
  earn_certificate:     150,
  attend_event:         50,
  community_post:       20,
  community_answer:     30,
  receive_upvote:       10,
  share_project:        50,
  complete_interview:   100,
  receive_offer:        300,
  daily_login:          10,
  refer_user:           100,
  mentor_session:       75,
};

const gamificationEngine = {
  /**
   * Award XP to a user and handle level-up.
   * @returns {{ totalXp, level, leveledUp, title }}
   */
  async awardXp(userId, action, customXp = null, details = '') {
    const xp = customXp ?? XP_MAP[action] ?? 10;

    // Log XP history
    await XpHistory.create({ userId, action, xp, details });

    // Update user level
    let userLevel = await UserLevel.findOne({ userId });
    if (!userLevel) userLevel = new UserLevel({ userId, level: 1, totalXp: 0 });

    const prevLevel = userLevel.level;
    userLevel.totalXp += xp;

    const { level, title, currentLevelXp, xpToNextLevel } = getLevelForXp(userLevel.totalXp);
    userLevel.level = level;
    userLevel.title = title;
    userLevel.currentLevelXp = currentLevelXp;
    userLevel.xpToNextLevel = xpToNextLevel;
    await userLevel.save();

    // Update active challenges
    await this.progressChallenges(userId, action);

    return { totalXp: userLevel.totalXp, level, leveledUp: level > prevLevel, title };
  },

  /**
   * Update streaks for a user.
   */
  async updateStreak(userId, type = 'login') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = await Streak.findOne({ userId, type });
    if (!streak) streak = new Streak({ userId, type, currentStreak: 0, longestStreak: 0 });

    const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
    if (lastActive) lastActive.setHours(0, 0, 0, 0);

    const diffDays = lastActive ? Math.floor((today - lastActive) / 86400000) : 999;

    if (diffDays === 0) {
      // Already logged today
      return { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak };
    } else if (diffDays === 1) {
      // Consecutive day
      streak.currentStreak += 1;
    } else {
      // Streak broken
      streak.currentStreak = 1;
      streak.streakStartDate = today;
    }

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }
    streak.lastActiveDate = today;

    // Streak XP bonuses
    const streakXp = streak.currentStreak === 7 ? 100 : streak.currentStreak === 30 ? 500 : streak.currentStreak % 7 === 0 ? 50 : 0;
    if (streakXp > 0) await this.awardXp(userId, 'streak_bonus', streakXp, `${streak.currentStreak}-day ${type} streak`);

    await streak.save();
    return { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak };
  },

  /**
   * Progress any active challenges that match this action.
   */
  async progressChallenges(userId, action) {
    const now = new Date();
    const activeChallenges = await Challenge.find({
      action, isActive: true,
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    }).lean();

    for (const ch of activeChallenges) {
      const uc = await UserChallenge.findOneAndUpdate(
        { userId, challengeId: ch._id, isCompleted: false },
        { $inc: { progress: 1 }, target: ch.target },
        { upsert: true, new: true }
      );
      if (uc.progress >= ch.target && !uc.isCompleted) {
        uc.isCompleted = true;
        uc.completedAt = new Date();
        uc.xpAwarded = ch.xpReward;
        await uc.save();
        await this.awardXp(userId, 'challenge_complete', ch.xpReward, `Completed: ${ch.title}`);
      }
    }
  },

  /**
   * Get user's gamification profile.
   */
  async getProfile(userId) {
    const [level, streaks, xpRecent] = await Promise.all([
      UserLevel.findOne({ userId }).lean() || { level: 1, totalXp: 0, title: 'Newcomer', currentLevelXp: 0, xpToNextLevel: 200 },
      Streak.find({ userId }).lean(),
      XpHistory.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return { level: level || { level: 1, totalXp: 0, title: 'Newcomer', currentLevelXp: 0, xpToNextLevel: 200 }, streaks, recentXp: xpRecent };
  },

  XP_MAP,
  LEVEL_THRESHOLDS,
};

export default gamificationEngine;
