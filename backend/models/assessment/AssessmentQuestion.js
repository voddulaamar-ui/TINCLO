import mongoose from 'mongoose';
const testCaseSchema = new mongoose.Schema({
  input: String, expected: String, isHidden: { type: Boolean, default: false },
}, { _id: false });

const assessmentQuestionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  type:           { type: String, enum: ['mcq', 'mcq_multi', 'true_false', 'fill_blank', 'coding', 'essay', 'match', 'image_mcq', 'sql', 'debug', 'output'], required: true, index: true },
  category:       { type: String, default: '', index: true },
  difficulty:     { type: String, enum: ['beginner', 'easy', 'medium', 'hard', 'expert'], default: 'medium', index: true },
  tags:           { type: [String], default: [] },
  // Content
  text:           { type: String, required: true },
  options:        { type: [String], default: [] },
  correctAnswer:  { type: String, default: '' },
  correctAnswers: { type: [String], default: [] },  // for multi-correct
  explanation:    { type: String, default: '' },
  imageUrl:       { type: String, default: null },
  // Coding specific
  starterCode:    { type: mongoose.Schema.Types.Mixed, default: {} },
  testCases:      { type: [testCaseSchema], default: [] },
  languages:      { type: [String], default: [] },
  timeLimit:      { type: Number, default: 0 },  // seconds
  memoryLimit:    { type: Number, default: 0 },  // MB
  // Scoring
  marks:          { type: Number, default: 1 },
  negativeMarks:  { type: Number, default: 0 },
  // Stats
  attemptCount:   { type: Number, default: 0 },
  correctCount:   { type: Number, default: 0 },
  createdBy:      { type: String, default: '' },
}, { timestamps: true });

assessmentQuestionSchema.index({ text: 'text', category: 'text', tags: 'text' });
export default mongoose.model('AssessmentQuestion', assessmentQuestionSchema);
