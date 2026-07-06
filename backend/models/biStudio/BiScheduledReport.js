import mongoose from 'mongoose';

const biScheduledReportSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  userId:         { type: String, required: true, index: true },
  dashboardId:    { type: mongoose.Schema.Types.ObjectId, ref: 'BiDashboard', default: null },
  name:           { type: String, required: true },
  frequency:      { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'], default: 'weekly' },
  schedule:       { type: String, default: '' },  // cron or day/time
  format:         { type: String, enum: ['pdf', 'excel', 'csv', 'png', 'json'], default: 'pdf' },
  recipients:     { type: [String], default: [] },
  deliveryChannel:{ type: String, enum: ['email', 'slack', 'teams', 'download'], default: 'email' },
  filters:        { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive:       { type: Boolean, default: true },
  lastGeneratedAt:{ type: Date, default: null },
  nextGenerateAt: { type: Date, default: null },
}, { timestamps: true });

biScheduledReportSchema.index({ isActive: 1, nextGenerateAt: 1 });
export default mongoose.model('BiScheduledReport', biScheduledReportSchema);
