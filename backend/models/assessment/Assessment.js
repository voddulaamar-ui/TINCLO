import mongoose from 'mongoose';
const sectionSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  type:        { type: String, enum: ['coding', 'mcq', 'aptitude', 'english', 'psychometric', 'personality', 'essay', 'assignment'], required: true },
  duration:    { type: Number, default: 0 },  // minutes
  questions:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' }],
  totalMarks:  { type: Number, default: 0 },
  passingMarks:{ type: Number, default: 0 },
  randomize:   { type: Boolean, default: false },
}, { _id: true });

const assessmentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  createdBy:      { type: String, required: true, index: true },
  title:          { type: String, required: true },
  description:    { type: String, default: '' },
  type:           { type: String, enum: ['coding', 'mcq', 'aptitude', 'english', 'psychometric', 'personality', 'hybrid', 'custom'], default: 'hybrid', index: true },
  sections:       { type: [sectionSchema], default: [] },
  totalDuration:  { type: Number, default: 60 },  // minutes
  totalMarks:     { type: Number, default: 100 },
  passingPercent: { type: Number, default: 60 },
  maxAttempts:    { type: Number, default: 1 },
  // Scheduling
  startTime:      { type: Date, default: null },
  endTime:        { type: Date, default: null },
  timezone:       { type: String, default: 'Asia/Kolkata' },
  // Proctoring
  proctoring: {
    enabled:       { type: Boolean, default: false },
    webcam:        { type: Boolean, default: false },
    screenRecord:  { type: Boolean, default: false },
    browserLock:   { type: Boolean, default: true },
    aiDetection:   { type: Boolean, default: false },
  },
  // Config
  instructions:   { type: String, default: '' },
  password:       { type: String, default: '' },
  candidates:     { type: [String], default: [] },  // invited userIds
  tags:           { type: [String], default: [] },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  status:         { type: String, enum: ['draft', 'scheduled', 'live', 'completed', 'archived'], default: 'draft', index: true },
  submissionCount:{ type: Number, default: 0 },
  generateCertificate: { type: Boolean, default: false },
}, { timestamps: true });

assessmentSchema.index({ title: 'text', tags: 'text' });
assessmentSchema.index({ status: 1, startTime: 1 });
export default mongoose.model('Assessment', assessmentSchema);
