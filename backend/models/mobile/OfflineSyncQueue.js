import mongoose from 'mongoose';

const offlineSyncQueueSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  deviceId:  { type: String, default: '' },
  action:    { type: String, required: true },   // 'apply_job', 'mark_attendance', 'send_message'
  payload:   { type: mongoose.Schema.Types.Mixed, required: true },
  status:    { type: String, enum: ['pending', 'synced', 'failed', 'conflict'], default: 'pending', index: true },
  queuedAt:  { type: Date, default: Date.now },
  syncedAt:  { type: Date, default: null },
  error:     { type: String, default: '' },
  retryCount:{ type: Number, default: 0 },
}, { timestamps: true });

offlineSyncQueueSchema.index({ userId: 1, status: 1, queuedAt: 1 });
export default mongoose.model('OfflineSyncQueue', offlineSyncQueueSchema);
