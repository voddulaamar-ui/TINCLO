import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action:    { type: String, required: true, index: true }, // 'job_created', 'user_login', etc.
  userId:    { type: String, default: null, index: true },  // who performed the action
  targetId:  { type: String, default: null },               // affected resource ID
  targetType:{ type: String, default: null },               // 'Job', 'User', 'Company'
  details:   { type: mongoose.Schema.Types.Mixed, default: {} },
  ip:        { type: String, default: null },
  userAgent: { type: String, default: null },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
