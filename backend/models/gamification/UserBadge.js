import mongoose from 'mongoose';

const userBadgeSchema = new mongoose.Schema({
  userId:   { type: String, required: true, index: true },
  badgeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', required: true },
  badgeKey: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
}, { timestamps: true });

userBadgeSchema.index({ userId: 1, badgeKey: 1 }, { unique: true });
export default mongoose.model('UserBadge', userBadgeSchema);
