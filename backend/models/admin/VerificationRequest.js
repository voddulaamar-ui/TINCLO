import mongoose from 'mongoose';

const verificationRequestSchema = new mongoose.Schema({
  type:           { type: String, enum: ['company', 'recruiter', 'candidate', 'identity'], required: true, index: true },
  targetId:       { type: String, required: true, index: true },  // userId or orgId
  targetName:     { type: String, default: '' },
  status:         { type: String, enum: ['pending', 'in_review', 'approved', 'rejected'], default: 'pending', index: true },
  documents:      [{ url: String, name: String, type: String }],
  notes:          { type: String, default: '' },
  reviewedBy:     { type: String, default: null },
  reviewedAt:     { type: Date, default: null },
  rejectionReason:{ type: String, default: '' },
  submittedBy:    { type: String, default: '' },
}, { timestamps: true });

verificationRequestSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model('VerificationRequest', verificationRequestSchema);
