import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input:    { type: String, default: '' },
  expected: { type: String, default: '' },
  isHidden: { type: Boolean, default: false },
}, { _id: false });

const codingChallengeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  slug:        { type: String, unique: true, index: true },
  description: { type: String, default: '' },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy', index: true },
  category:    { type: String, default: '', index: true },
  tags:        { type: [String], default: [] },
  languages:   { type: [String], default: ['javascript', 'python'] },
  starterCode: { type: mongoose.Schema.Types.Mixed, default: {} },  // { javascript: '...', python: '...' }
  solution:    { type: mongoose.Schema.Types.Mixed, default: {} },
  testCases:   { type: [testCaseSchema], default: [] },
  timeLimit:   { type: Number, default: 0 },  // minutes
  points:      { type: Number, default: 10 },
  solvedCount: { type: Number, default: 0 },
  attemptCount:{ type: Number, default: 0 },
  companyTag:  { type: String, default: '' },
  isContest:   { type: Boolean, default: false },
  contestId:   { type: String, default: null },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

codingChallengeSchema.index({ title: 'text', category: 'text', tags: 'text' });
export default mongoose.model('CodingChallenge', codingChallengeSchema);
