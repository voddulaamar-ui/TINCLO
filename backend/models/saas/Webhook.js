import mongoose from 'mongoose';

const webhookSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  url:            { type: String, required: true },
  secret:         { type: String, default: '' },
  events:         { type: [String], default: [] },  // ['job.created', 'candidate.applied', 'offer.accepted']
  isActive:       { type: Boolean, default: true },
  failCount:      { type: Number, default: 0 },
  lastTriggeredAt:{ type: Date, default: null },
  lastStatus:     { type: Number, default: null },
  createdBy:      { type: String, default: '' },
}, { timestamps: true });

webhookSchema.index({ organizationId: 1, isActive: 1 });
export default mongoose.model('Webhook', webhookSchema);
