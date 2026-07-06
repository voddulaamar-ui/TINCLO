import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true, index: true },  // 'first_application', 'coding_100'
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: String, enum: ['profile', 'learning', 'jobs', 'community', 'recruitment', 'events', 'coding', 'mentorship'], default: 'jobs', index: true },
  icon:        { type: String, default: '🏆' },
  xpReward:    { type: Number, default: 50 },
  condition:   { type: mongoose.Schema.Types.Mixed, default: {} },  // { action: 'apply_job', count: 10 }
  isActive:    { type: Boolean, default: true },
  tier:        { type: String, enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'], default: 'bronze' },
}, { timestamps: true });

export default mongoose.model('Achievement', achievementSchema);
