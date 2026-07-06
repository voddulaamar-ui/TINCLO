import mongoose from 'mongoose';

const verificationBadgeSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  // Badge info
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  icon:         { type: String, default: '🏅' },
  category:     { type: String, default: '' },
  // Linked skills
  skills:       { type: [String], default: [] },
  // Certificate
  certificateId:{ type: String, default: '' },
  qrCode:       { type: String, default: '' },
  verificationUrl: { type: String, default: '' },
  // Issuer
  issuedBy:     { type: String, default: 'TINCLO' },
  issuedAt:     { type: Date, default: Date.now },
  expiresAt:    { type: Date, default: null },
  // Status
  status:       { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
  isPublic:     { type: Boolean, default: true },
}, { timestamps: true });

verificationBadgeSchema.index({ userId: 1, status: 1 });
export default mongoose.model('VerificationBadge', verificationBadgeSchema);
