import mongoose from 'mongoose';
const privacyRequestSchema = new mongoose.Schema({
  userId:     { type: String, required: true, index: true },
  type:       { type: String, enum: ['data_export', 'data_deletion', 'consent_withdrawal', 'access_request'], required: true },
  status:     { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending', index: true },
  reason:     { type: String, default: '' },
  processedBy:{ type: String, default: null },
  processedAt:{ type: Date, default: null },
  dataUrl:    { type: String, default: null },  // for export requests
}, { timestamps: true });

privacyRequestSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model('PrivacyRequest', privacyRequestSchema);
