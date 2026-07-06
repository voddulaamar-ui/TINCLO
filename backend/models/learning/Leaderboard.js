import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema({
  userId:     { type: String, required: true, index: true },
  username:   { type: String, default: '' },
  type:       { type: String, enum: ['coding', 'courses', 'community', 'mentorship', 'projects', 'overall'], default: 'overall', index: true },
  score:      { type: Number, default: 0 },
  xp:         { type: Number, default: 0 },
  level:      { type: Number, default: 1 },
  rank:       { type: Number, default: 0 },
  badges:     { type: [String], default: [] },
  streak:     { type: Number, default: 0 },
  achievements:{ type: [String], default: [] },
  // Gamification
  totalChallengesSolved: { type: Number, default: 0 },
  totalCoursesCompleted: { type: Number, default: 0 },
  totalCertificates:     { type: Number, default: 0 },
  communityReputation:   { type: Number, default: 0 },
}, { timestamps: true });

leaderboardSchema.index({ type: 1, score: -1 });
leaderboardSchema.index({ userId: 1, type: 1 }, { unique: true });
export default mongoose.model('Leaderboard', leaderboardSchema);
