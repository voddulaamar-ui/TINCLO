import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  audience: { type: String, enum: ['candidate', 'recruiter', 'admin', 'all'], default: 'candidate', index: true },
  type: { type: String, default: 'system', index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, default: '' },
  icon: { type: String, default: 'bell' },
  read: { type: Boolean, default: false, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
