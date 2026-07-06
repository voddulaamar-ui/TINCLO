import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  // References
  jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  matchId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Match', index: true },
  candidateId:  { type: String, required: true, index: true },  // User.userId
  recruiterId:  { type: String, required: true, index: true },  // User.userId

  // Schedule
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, default: '' },          // "10:00 AM"
  duration:      { type: Number, default: 60 },          // minutes
  timezone:      { type: String, default: 'IST' },

  // Type & Mode
  interviewType: {
    type: String,
    enum: ['technical', 'hr', 'phone', 'online', 'offline', 'panel'],
    default: 'online',
  },
  mode: {
    type: String,
    enum: ['Online', 'Offline', 'Phone'],
    default: 'Online',
  },

  // Meeting details
  meetingLink:    { type: String, default: '' },
  meetingNotes:   { type: String, default: '' },
  location:       { type: String, default: '' },         // for offline interviews

  // Status tracking
  status: {
    type: String,
    enum: ['scheduled', 'accepted', 'reschedule_requested', 'rescheduled', 'cancelled', 'completed', 'no_show'],
    default: 'scheduled',
    index: true,
  },

  // Reschedule
  rescheduleReason:  { type: String, default: '' },
  rescheduleDate:    { type: Date, default: null },

  // Outcome
  outcome: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'on_hold'],
    default: 'pending',
  },

  // Timeline stage
  stage: {
    type: String,
    enum: ['applied', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offer', 'joined', 'rejected'],
    default: 'interview_scheduled',
  },

  // Metadata
  round:         { type: Number, default: 1 },
  jobTitle:      { type: String, default: '' },
  company:       { type: String, default: '' },
}, { timestamps: true });

interviewSchema.index({ candidateId: 1, scheduledDate: -1 });
interviewSchema.index({ recruiterId: 1, scheduledDate: -1 });
interviewSchema.index({ jobId: 1, status: 1 });

export default mongoose.model('Interview', interviewSchema);
