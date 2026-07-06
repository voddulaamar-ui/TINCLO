import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  // Who referred
  referrerId:    { type: String, required: true, index: true },  // User.userId
  referrerName:  { type: String, default: '' },

  // Who was referred
  candidateId:   { type: String, default: null, index: true },   // User.userId (once they sign up)
  candidateEmail:{ type: String, required: true },
  candidateName: { type: String, default: '' },

  // Job context
  jobId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  company:       { type: String, default: '' },
  jobTitle:      { type: String, default: '' },

  // Tracking
  referralCode:  { type: String, unique: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'signed_up', 'applied', 'interviewed', 'hired', 'rejected', 'expired'],
    default: 'pending',
    index: true,
  },

  // Reward
  rewardGranted: { type: Boolean, default: false },
  rewardDetails: { type: String, default: '' },

  // Recruiter approval
  approvedBy:    { type: String, default: null },
  approvedAt:    { type: Date, default: null },

  expiresAt:     { type: Date, default: null },
}, { timestamps: true });

referralSchema.index({ referrerId: 1, status: 1 });
referralSchema.index({ candidateEmail: 1 });

export default mongoose.model('Referral', referralSchema);
