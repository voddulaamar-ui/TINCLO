import mongoose from 'mongoose';

const liveActivitySchema = new mongoose.Schema({
  orgId:        { type: String, index: true, default: '' },
  type:         { type: String, required: true, enum: [
    'candidate.applied', 'resume.scored', 'candidate.shortlisted',
    'interview.scheduled', 'interview.completed', 'assessment.completed',
    'offer.generated', 'offer.accepted', 'offer.rejected',
    'employee.joined', 'recruiter.assigned', 'job.created', 'job.closed',
    'notification.sent', 'sla.violated', 'note.added',
  ]},
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  // Actors
  candidateId:  { type: String, default: '' },
  candidateName:{ type: String, default: '' },
  recruiterId:  { type: String, default: '' },
  recruiterName:{ type: String, default: '' },
  jobId:        { type: String, default: '' },
  jobTitle:     { type: String, default: '' },
  department:   { type: String, default: '' },
  // Metadata
  priority:     { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  score:        { type: Number, default: null },
  stage:        { type: String, default: '' },
  location:     { type: String, default: '' },
}, { timestamps: true });

liveActivitySchema.index({ createdAt: -1 });
liveActivitySchema.index({ orgId: 1, createdAt: -1 });
export default mongoose.model('LiveActivity', liveActivitySchema);
