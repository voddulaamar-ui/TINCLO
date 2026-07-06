import mongoose from 'mongoose';

const usageMetricSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  period:         { type: String, required: true },  // '2025-07' (monthly)
  recruiters:     { type: Number, default: 0 },
  activeJobs:     { type: Number, default: 0 },
  applications:   { type: Number, default: 0 },
  storageMb:      { type: Number, default: 0 },
  aiRequests:     { type: Number, default: 0 },
  emailsSent:     { type: Number, default: 0 },
  apiRequests:    { type: Number, default: 0 },
  messages:       { type: Number, default: 0 },
}, { timestamps: true });

usageMetricSchema.index({ organizationId: 1, period: 1 }, { unique: true });
export default mongoose.model('UsageMetric', usageMetricSchema);
