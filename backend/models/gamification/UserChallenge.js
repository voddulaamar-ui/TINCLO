import mongoose from 'mongoose';

const userChallengeSchema = new mongoose.Schema({
  userId:      { type: String, required: true, index: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  progress:    { type: Number, default: 0 },
  target:      { type: Number, default: 1 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  xpAwarded:   { type: Number, default: 0 },
}, { timestamps: true });

userChallengeSchema.index({ userId: 1, challengeId: 1 }, { unique: true });
userChallengeSchema.index({ userId: 1, isCompleted: 1 });
export default mongoose.model('UserChallenge', userChallengeSchema);
