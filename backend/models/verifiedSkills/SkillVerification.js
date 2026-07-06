import mongoose from 'mongoose';

const skillVerificationSchema = new mongoose.Schema({
  userId:         { type: String, required: true, index: true },
  skill:          { type: String, required: true },
  // Request
  requestType:    { type: String, enum: ['assessment', 'employer', 'manager', 'project', 'hackathon', 'certification', 'university', 'opensource', 'mentor'], required: true },
  requestedBy:    { type: String, default: '' }, // userId who initiated
  verifierId:     { type: String, default: '' }, // employer/manager/mentor userId
  verifierName:   { type: String, default: '' },
  verifierOrg:    { type: String, default: '' },
  verifierRole:   { type: String, default: '' },
  // Evidence
  evidenceTitle:  { type: String, default: '' },
  evidenceUrl:    { type: String, default: '' },
  evidenceScore:  { type: Number, default: 0 },
  comments:       { type: String, default: '' },
  // Result
  status:         { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' },
  verifiedAt:     { type: Date, default: null },
  rejectedAt:     { type: Date, default: null },
  rejectionReason:{ type: String, default: '' },
  // Fraud detection
  flagged:        { type: Boolean, default: false },
  flagReason:     { type: String, default: '' },
}, { timestamps: true });

skillVerificationSchema.index({ userId: 1, skill: 1, requestType: 1 });
skillVerificationSchema.index({ verifierId: 1, status: 1 });
export default mongoose.model('SkillVerification', skillVerificationSchema);
