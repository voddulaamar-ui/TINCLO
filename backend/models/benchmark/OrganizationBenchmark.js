import mongoose from 'mongoose';

const organizationBenchmarkSchema = new mongoose.Schema({
  orgId:          { type: String, required: true, index: true },
  // Organization Performance Index (OPI)
  overallScore:   { type: Number, default: 0 },
  industryRank:   { type: String, default: '' }, // e.g. 'Top 12%'
  percentile:     { type: Number, default: 50 },
  // Category scores (0-100)
  recruitment:    { type: Number, default: 0 },
  hr:             { type: Number, default: 0 },
  learning:       { type: Number, default: 0 },
  productivity:   { type: Number, default: 0 },
  retention:      { type: Number, default: 0 },
  automation:     { type: Number, default: 0 },
  aiAdoption:     { type: Number, default: 0 },
  employeeSatisfaction: { type: Number, default: 0 },
  // Recruitment metrics
  avgTimeToHire:  { type: Number, default: 0 },
  avgTimeToFill:  { type: Number, default: 0 },
  appsPerJob:     { type: Number, default: 0 },
  offerAcceptRate:{ type: Number, default: 0 },
  costPerHire:    { type: Number, default: 0 },
  qualityOfHire:  { type: Number, default: 0 },
  candidateSatisfaction: { type: Number, default: 0 },
  // Workforce
  employeeCount:  { type: Number, default: 0 },
  growthRate:     { type: Number, default: 0 },
  attritionRate:  { type: Number, default: 0 },
  avgTenure:      { type: Number, default: 0 },
  promotionRate:  { type: Number, default: 0 },
  // Learning
  trainingHours:  { type: Number, default: 0 },
  certificationRate: { type: Number, default: 0 },
  learningROI:    { type: Number, default: 0 },
  // Config
  industry:       { type: String, default: 'IT' },
  companySize:    { type: String, enum: ['startup', 'smb', 'mid_market', 'enterprise', 'global'], default: 'mid_market' },
  region:         { type: String, default: '' },
  participatesInBenchmark: { type: Boolean, default: true },
  // History
  history: [{
    date:   { type: Date, default: Date.now },
    score:  { type: Number },
    rank:   { type: String },
  }],
  period:         { type: String, default: '' },
  lastCalculated: { type: Date, default: Date.now },
}, { timestamps: true });

organizationBenchmarkSchema.index({ orgId: 1, period: 1 });
export default mongoose.model('OrganizationBenchmark', organizationBenchmarkSchema);
