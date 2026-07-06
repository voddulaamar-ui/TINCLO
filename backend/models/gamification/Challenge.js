import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  type:        { type: String, enum: ['daily', 'weekly', 'monthly', 'seasonal'], default: 'daily', index: true },
  category:    { type: String, default: 'general' },
  action:      { type: String, required: true },       // 'apply_job', 'complete_lesson', 'solve_challenge'
  target:      { type: Number, default: 1 },           // how many times
  xpReward:    { type: Number, default: 20 },
  badgeReward: { type: String, default: null },
  isActive:    { type: Boolean, default: true },
  startsAt:    { type: Date, default: null },
  endsAt:      { type: Date, default: null },
  icon:        { type: String, default: '🎯' },
}, { timestamps: true });

challengeSchema.index({ type: 1, isActive: 1 });
export default mongoose.model('Challenge', challengeSchema);
