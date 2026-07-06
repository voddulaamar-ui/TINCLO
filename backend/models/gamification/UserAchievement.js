import mongoose from 'mongoose';

const userAchievementSchema = new mongoose.Schema({
  userId:        { type: String, required: true, index: true },
  achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  achievementKey:{ type: String, required: true },
  unlockedAt:    { type: Date, default: Date.now },
  xpAwarded:     { type: Number, default: 0 },
}, { timestamps: true });

userAchievementSchema.index({ userId: 1, achievementKey: 1 }, { unique: true });
export default mongoose.model('UserAchievement', userAchievementSchema);
