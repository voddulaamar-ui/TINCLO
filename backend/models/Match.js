import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
    // userId references User.userId (String), not User._id (ObjectId)
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  applied: {
    type: Boolean,
    default: false,
  },
  // Phase 1: rich application tracker status
  applicationStatus: {
    type: String,
    enum: ['saved', 'applied', 'under_review', 'interview_scheduled', 'offer', 'rejected'],
    default: 'saved',
  },
  statusUpdatedAt: { type: Date },

  // Phase 1: rule-based match score (0–100) and explanation
  matchScore: { type: Number, default: 0 },
  matchDetails: {
    matchedSkills:   { type: [String], default: [] },
    missingSkills:   { type: [String], default: [] },
    matchedDomain:   { type: Boolean, default: false },
    matchedLocation: { type: Boolean, default: false },
    experienceMatch: { type: Boolean, default: false },
  },

  matchedAt: { type: Date, default: Date.now },
});

matchSchema.index({ userId: 1, jobId: 1 }, { unique: true });
// Phase 2: support fast dashboard/analytics queries by status
matchSchema.index({ userId: 1, applicationStatus: 1 });
matchSchema.index({ jobId: 1, applicationStatus: 1 });
matchSchema.index({ userId: 1, applied: 1, matchedAt: -1 });

export default mongoose.model('Match', matchSchema);
