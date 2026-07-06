import mongoose from 'mongoose';

const xpHistorySchema = new mongoose.Schema({
  userId:   { type: String, required: true, index: true },
  action:   { type: String, required: true, index: true },  // 'apply_job', 'complete_course', etc.
  xp:       { type: Number, required: true },
  details:  { type: String, default: '' },
  sourceId: { type: String, default: null },                 // job/course/challenge ID
}, { timestamps: true });

xpHistorySchema.index({ userId: 1, createdAt: -1 });
export default mongoose.model('XpHistory', xpHistorySchema);
