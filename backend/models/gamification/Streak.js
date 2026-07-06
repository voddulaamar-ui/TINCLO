import mongoose from 'mongoose';

const streakSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  type:         { type: String, enum: ['login', 'learning', 'coding', 'application', 'community'], default: 'login', index: true },
  currentStreak:{ type: Number, default: 0 },
  longestStreak:{ type: Number, default: 0 },
  lastActiveDate:{ type: Date, default: null },
  streakStartDate:{ type: Date, default: null },
  history:      [{ date: Date, active: Boolean }],  // last 30 days
}, { timestamps: true });

streakSchema.index({ userId: 1, type: 1 }, { unique: true });
export default mongoose.model('Streak', streakSchema);
