import mongoose from 'mongoose';

/**
 * Universal Identity — one user, multiple professional roles.
 */
const userIdentitySchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true, index: true },
  activeRole:   { type: String, default: 'candidate' },
  roles:        { type: [String], default: ['candidate'] },  // candidate, employee, recruiter, mentor, freelancer, etc.
  organizations:[{ orgId: mongoose.Schema.Types.ObjectId, role: String, department: String }],
  preferences: {
    theme:       { type: String, default: 'system' },
    language:    { type: String, default: 'en' },
    currency:    { type: String, default: 'INR' },
    timezone:    { type: String, default: 'Asia/Kolkata' },
    pinnedApps:  { type: [String], default: [] },
    workspace:   { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  // Career timeline
  careerStage:  { type: String, enum: ['student', 'fresher', 'professional', 'senior', 'executive', 'freelancer', 'mentor', 'retired'], default: 'professional' },
  joinedAt:     { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('UserIdentity', userIdentitySchema);
