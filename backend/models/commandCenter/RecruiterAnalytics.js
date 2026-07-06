import mongoose from 'mongoose';

const recruiterAnalyticsSchema = new mongoose.Schema({
  orgId:          { type: String, index: true, default: '' },
  recruiterId:    { type: String, required: true, index: true },
  recruiterName:  { type: String, default: '' },
  period:         { type: String, default: '' },
  // Performance
  applicationsReviewed: { type: Number, default: 0 },
  interviewsConducted:  { type: Number, default: 0 },
  offersGenerated:      { type: Number, default: 0 },
  offersAccepted:       { type: Number, default: 0 },
  candidatesHired:      { type: Number, default: 0 },
  // Speed
  avgResponseTime:      { type: Number, default: 0 }, // hours
  avgTimeToHire:        { type: Number, default: 0 }, // days
  // Workload
  assignedJobs:         { type: Number, default: 0 },
  assignedCandidates:   { type: Number, default: 0 },
  pendingReviews:       { type: Number, default: 0 },
  pendingInterviews:    { type: Number, default: 0 },
  pendingApprovals:     { type: Number, default: 0 },
  // Quality
  candidateSatisfaction:{ type: Number, default: 0 }, // 0-100
  hiringSuccess:        { type: Number, default: 0 }, // percentage
  // Status
  isOnline:             { type: Boolean, default: false },
  lastActive:           { type: Date, default: Date.now },
}, { timestamps: true });

recruiterAnalyticsSchema.index({ orgId: 1, recruiterId: 1, period: 1 });
export default mongoose.model('RecruiterAnalytics', recruiterAnalyticsSchema);
