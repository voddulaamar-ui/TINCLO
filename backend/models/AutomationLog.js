import mongoose from 'mongoose';

/**
 * Logs automated actions (reminders, archiving, reports).
 */
const automationLogSchema = new mongoose.Schema({
  action:      { type: String, required: true, index: true },  // 'send_reminder', 'archive_job', 'reject_inactive'
  targetType:  { type: String, default: '' },                   // 'Job', 'User', 'Match'
  targetId:    { type: String, default: '' },
  details:     { type: mongoose.Schema.Types.Mixed, default: {} },
  success:     { type: Boolean, default: true },
  error:       { type: String, default: '' },
}, { timestamps: true });

automationLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AutomationLog', automationLogSchema);
