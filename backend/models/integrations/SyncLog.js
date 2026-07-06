import mongoose from 'mongoose';

const syncLogSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  userId:         { type: String, default: null, index: true },
  providerKey:    { type: String, required: true, index: true },
  action:         { type: String, required: true },   // 'calendar_sync', 'resume_import', 'profile_import'
  direction:      { type: String, enum: ['inbound', 'outbound'], default: 'inbound' },
  status:         { type: String, enum: ['success', 'failed', 'partial', 'skipped'], default: 'success' },
  recordsProcessed: { type: Number, default: 0 },
  recordsFailed:  { type: Number, default: 0 },
  error:          { type: String, default: '' },
  details:        { type: mongoose.Schema.Types.Mixed, default: {} },
  duration:       { type: Number, default: 0 },  // ms
}, { timestamps: true });

syncLogSchema.index({ providerKey: 1, createdAt: -1 });
syncLogSchema.index({ userId: 1, createdAt: -1 });
export default mongoose.model('SyncLog', syncLogSchema);
