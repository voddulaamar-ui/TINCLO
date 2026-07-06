import mongoose from 'mongoose';

const interviewScorecardSchema = new mongoose.Schema({
  roomId:         { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewRoom', required: true, index: true },
  interviewerId:  { type: String, required: true },
  interviewerName:{ type: String, default: '' },
  candidateId:    { type: String, required: true },
  // Scores (1-5 scale)
  scores: [{
    criterion:    { type: String }, // e.g. 'Technical Skills', 'Problem Solving'
    score:        { type: Number, min: 1, max: 5 },
    notes:        { type: String, default: '' },
  }],
  overallScore:   { type: Number, min: 1, max: 5, default: 3 },
  // Structured feedback
  strengths:      { type: [String], default: [] },
  weaknesses:     { type: [String], default: [] },
  recommendation: { type: String, enum: ['strong_hire', 'hire', 'neutral', 'no_hire', 'strong_no_hire'], default: 'neutral' },
  comments:       { type: String, default: '' },
  // Decision
  decision:       { type: String, enum: ['advance', 'hold', 'reject', 'pending'], default: 'pending' },
  nextSteps:      { type: String, default: '' },
  // Meta
  submittedAt:    { type: Date, default: null },
  status:         { type: String, enum: ['draft', 'submitted'], default: 'draft' },
}, { timestamps: true });

interviewScorecardSchema.index({ roomId: 1, interviewerId: 1 });
export default mongoose.model('InterviewScorecard', interviewScorecardSchema);
