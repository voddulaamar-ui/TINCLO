import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  eventType: {
    type: String,
    enum: ['job_viewed', 'swiped_right', 'swiped_left', 'job_saved', 'job_applied', 'profile_viewed', 'search'],
    required: true,
    index: true,
  },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

analyticsEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
