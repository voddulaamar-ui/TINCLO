import mongoose from 'mongoose';
const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  answer:     { type: String, default: '' },
  code:       { type: String, default: '' },
  language:   { type: String, default: '' },
  isCorrect:  { type: Boolean, default: null },
  marks:      { type: Number, default: 0 },
  timeTaken:  { type: Number, default: 0 },  // seconds
}, { _id: true });

const violationSchema = new mongoose.Schema({
  type:       { type: String },  // 'tab_switch', 'no_face', 'multiple_faces', 'copy_paste'
  at:         { type: Date, default: Date.now },
  details:    { type: String, default: '' },
}, { _id: false });

const assessmentSubmissionSchema = new mongoose.Schema({
  assessmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
  candidateId:    { type: String, required: true, index: true },
  // Answers
  answers:        { type: [answerSchema], default: [] },
  // Scoring
  totalScore:     { type: Number, default: 0 },
  maxScore:       { type: Number, default: 0 },
  percentage:     { type: Number, default: 0 },
  passed:         { type: Boolean, default: false },
  rank:           { type: Number, default: 0 },
  // Timing
  startedAt:      { type: Date, default: null },
  submittedAt:    { type: Date, default: null },
  timeTaken:      { type: Number, default: 0 },  // minutes
  // Proctoring
  violations:     { type: [violationSchema], default: [] },
  violationCount: { type: Number, default: 0 },
  webcamImages:   { type: [String], default: [] },  // URLs
  screenRecordUrl:{ type: String, default: null },
  // Status
  status:         { type: String, enum: ['not_started', 'in_progress', 'submitted', 'evaluated', 'disqualified'], default: 'not_started', index: true },
  evaluatedBy:    { type: String, default: null },
  evaluatedAt:    { type: Date, default: null },
  certificateId:  { type: String, default: null },
  // Section scores
  sectionScores:  { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

assessmentSubmissionSchema.index({ assessmentId: 1, candidateId: 1 }, { unique: true });
assessmentSubmissionSchema.index({ assessmentId: 1, totalScore: -1 });
export default mongoose.model('AssessmentSubmission', assessmentSubmissionSchema);
