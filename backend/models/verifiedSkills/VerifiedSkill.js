import mongoose from 'mongoose';

const verifiedSkillSchema = new mongoose.Schema({
  userId:         { type: String, required: true, index: true },
  skill:          { type: String, required: true },
  // Verification
  verificationLevel: { type: Number, min: 1, max: 5, default: 1 },
  // 1=Self Declared, 2=Assessment, 3=Project, 4=Employer, 5=Multi-Source
  confidence:     { type: Number, default: 0 }, // 0-100
  status:         { type: String, enum: ['verified', 'pending', 'expired', 'revoked'], default: 'pending' },
  // Sources
  sources: [{
    type: { type: String, enum: ['assessment', 'employer', 'manager', 'project', 'hackathon', 'certification', 'university', 'opensource', 'mentor', 'peer', 'interview', 'training'] },
    name: String, score: Number, date: Date, verifiedBy: String, evidenceId: String,
  }],
  // Evidence
  evidence: [{
    type: { type: String, enum: ['assessment_score', 'project', 'github', 'certificate', 'employer_review', 'interview', 'hackathon', 'document'] },
    title: String, description: String, url: String, score: Number, date: Date,
  }],
  // Certificate
  certificateId:  { type: String, default: '' },
  qrCode:         { type: String, default: '' },
  verificationUrl:{ type: String, default: '' },
  // Timeline
  firstLearned:   { type: Date, default: null },
  firstVerified:  { type: Date, default: null },
  lastVerified:   { type: Date, default: null },
  expiresAt:      { type: Date, default: null },
  // Badge
  badge:          { type: String, default: '' },
  badgeIcon:      { type: String, default: '' },
  // Meta
  category:       { type: String, default: '' }, // e.g. 'frontend', 'cloud', 'ai'
  isPublic:       { type: Boolean, default: true },
}, { timestamps: true });

verifiedSkillSchema.index({ userId: 1, skill: 1 }, { unique: true });
verifiedSkillSchema.index({ userId: 1, status: 1 });
export default mongoose.model('VerifiedSkill', verifiedSkillSchema);
