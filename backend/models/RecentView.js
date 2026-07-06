import mongoose from 'mongoose';

const recentViewSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  viewedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

recentViewSchema.index({ userId: 1, jobId: 1 }, { unique: true });
recentViewSchema.index({ userId: 1, viewedAt: -1 });

export default mongoose.model('RecentView', recentViewSchema);
