import mongoose from 'mongoose';

const hackathonCertificateSchema = new mongoose.Schema({
  hackathonId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  userId:       { type: String, required: true, index: true },
  userName:     { type: String, default: '' },
  teamName:     { type: String, default: '' },
  // Certificate
  type:         { type: String, enum: ['participation', 'winner', 'runner_up', 'top_performer', 'innovation', 'coding_excellence', 'leadership', 'mentor', 'judge'], default: 'participation' },
  title:        { type: String, default: '' },
  description:  { type: String, default: '' },
  rank:         { type: Number, default: 0 },
  score:        { type: Number, default: 0 },
  // Verification
  certificateId:{ type: String, unique: true },
  qrCode:       { type: String, default: '' },
  verificationUrl: { type: String, default: '' },
  // Issuer
  issuerName:   { type: String, default: '' },
  issuerOrg:    { type: String, default: '' },
  issuedAt:     { type: Date, default: Date.now },
  // Badge
  badge:        { type: String, default: '' },
  badgeIcon:    { type: String, default: '' },
}, { timestamps: true });

hackathonCertificateSchema.index({ hackathonId: 1, userId: 1 });
export default mongoose.model('HackathonCertificate', hackathonCertificateSchema);
