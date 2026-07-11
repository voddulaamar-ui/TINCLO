import mongoose from 'mongoose';

const interviewFeedbackSchema = new mongoose.Schema({
  interviewId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, index: true },
  jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
  candidateId:  { type: String, required: true, index: true },
  recruiterId:  { type: String, required: true },

  // Ratings (1-5)
  technicalSkills: { type: Number, min: 1, max: 5, default: null },
  communication:   { type: Number, min: 1, max: 5, default: null },
  problemSolving:  { type: Number, min: 1, max: 5, default: null },
  cultureFit:      { type: Number, min: 1, max: 5, default: null },
  overallRating:   { type: Number, min: 1, max: 5, default: null },

  // Text feedback
  strengths:    { type: String, default: '' },
  weaknesses:   { type: String, default: '' },
  remarks:      { type: String, default: '' },
  recommendation: {
    type: String,
    enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire'],
    default: 'maybe',
  },

  // Visibility
  visibleToCandidate: { type: Boolean, default: false },
}, { timestamps: true });

interviewFeedbackSchema.index({ candidateId: 1, createdAt: -1 });

export default mongoose.model('InterviewFeedback', interviewFeedbackSchema);
