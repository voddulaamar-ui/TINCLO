import mongoose from 'mongoose';

const userLevelSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true, index: true },
  level:        { type: Number, default: 1 },
  totalXp:      { type: Number, default: 0 },
  currentLevelXp: { type: Number, default: 0 },    // XP within current level
  xpToNextLevel:{ type: Number, default: 200 },
  title:        { type: String, default: 'Newcomer' },  // 'Newcomer', 'Explorer', 'Achiever', 'Expert', 'Legend'
}, { timestamps: true });

export default mongoose.model('UserLevel', userLevelSchema);
