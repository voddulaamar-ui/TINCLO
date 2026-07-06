import mongoose from 'mongoose';

const userGoalSchema = new mongoose.Schema({
  userId:      { type: String, required: true, index: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  targetAction:{ type: String, default: '' },
  targetCount: { type: Number, default: 1 },
  progress:    { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  deadline:    { type: Date, default: null },
}, { timestamps: true });

userGoalSchema.index({ userId: 1, isCompleted: 1 });
export default mongoose.model('UserGoal', userGoalSchema);
