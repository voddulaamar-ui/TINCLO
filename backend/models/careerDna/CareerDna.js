import mongoose from 'mongoose';

const careerDnaSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  // ── Core DNA Scores (0–100) ────────────────────────────────────────────────
  overallScore:    { type: Number, default: 0 },
  careerReadiness: { type: Number, default: 0 },
  growthPotential: { type: Number, default: 0 },
  // Dimensions
  technical:       { type: Number, default: 0 },
  learning:        { type: Number, default: 0 },
  assessment:      { type: Number, default: 0 },
  project:         { type: Number, default: 0 },
  experience:      { type: Number, default: 0 },
  communication:   { type: Number, default: 0 },
  leadership:      { type: Number, default: 0 },
  innovation:      { type: Number, default: 0 },
  collaboration:   { type: Number, default: 0 },
  // Career Goals
  goals: {
    dreamRole:     { type: String, default: '' },
    dreamCompany:  { type: String, default: '' },
    salaryGoal:    { type: String, default: '' },
    preferredLocation: { type: String, default: '' },
    preferredIndustry: { type: String, default: '' },
    preferredStack:{ type: [String], default: [] },
    workStyle:     { type: String, enum: ['remote', 'hybrid', 'office', ''], default: '' },
  },
  // Career Readiness per role
  roleReadiness: [{
    role:    { type: String },
    percent: { type: Number, default: 0 },
  }],
  // Salary DNA
  salary: {
    estimatedCurrent: { type: Number, default: 0 },
    estimatedMax:     { type: Number, default: 0 },
    fiveYearProjection:{ type: Number, default: 0 },
    marketPosition:   { type: String, enum: ['below', 'average', 'above', 'top'], default: 'average' },
  },
  // Personality
  personality: {
    workStyle:     { type: String, default: '' },
    decisionStyle: { type: String, default: '' },
    learningStyle: { type: String, default: '' },
    collaborationStyle: { type: String, default: '' },
  },
  // Privacy
  privacy: {
    visibility: { type: String, enum: ['public', 'recruiters', 'connections', 'private'], default: 'recruiters' },
    showSalary: { type: Boolean, default: false },
    showPersonality: { type: Boolean, default: true },
    showGrowthPotential: { type: Boolean, default: true },
  },
  // History
  history: [{
    date:  { type: Date, default: Date.now },
    score: { type: Number },
  }],
  // AI Insights
  aiInsights: { type: [String], default: [] },
  lastCalculatedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('CareerDna', careerDnaSchema);
