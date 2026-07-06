import mongoose from 'mongoose';

const recruitmentAlertSchema = new mongoose.Schema({
  orgId:        { type: String, index: true, default: '' },
  type:         { type: String, enum: [
    'no_applications', 'candidate_stuck', 'offer_pending', 'interview_overdue',
    'assessment_incomplete', 'recruiter_overloaded', 'critical_vacancy',
    'sla_violation', 'high_dropout', 'budget_exceeded', 'custom',
  ], required: true },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  severity:     { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  // References
  jobId:        { type: String, default: '' },
  jobTitle:     { type: String, default: '' },
  candidateId:  { type: String, default: '' },
  recruiterId:  { type: String, default: '' },
  department:   { type: String, default: '' },
  // Status
  status:       { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
  acknowledgedBy: { type: String, default: '' },
  resolvedAt:   { type: Date, default: null },
  // Notification channels
  notifyEmail:  { type: Boolean, default: false },
  notifyPush:   { type: Boolean, default: true },
  notifySlack:  { type: Boolean, default: false },
}, { timestamps: true });

recruitmentAlertSchema.index({ orgId: 1, status: 1, createdAt: -1 });
export default mongoose.model('RecruitmentAlert', recruitmentAlertSchema);
