import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema({
  type:       { type: String, required: true, index: true },  // 'failed_login', 'account_locked', 'suspicious_activity'
  userId:     { type: String, default: null, index: true },
  ip:         { type: String, default: '' },
  userAgent:  { type: String, default: '' },
  details:    { type: mongoose.Schema.Types.Mixed, default: {} },
  severity:   { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low', index: true },
  resolved:   { type: Boolean, default: false },
  resolvedBy: { type: String, default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

securityEventSchema.index({ type: 1, severity: 1, createdAt: -1 });
export default mongoose.model('SecurityEvent', securityEventSchema);
