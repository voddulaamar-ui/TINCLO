import mongoose from 'mongoose';

const industryBenchmarkSchema = new mongoose.Schema({
  industry:       { type: String, required: true, index: true },
  companySize:    { type: String, default: 'all' },
  region:         { type: String, default: 'all' },
  participantCount: { type: Number, default: 0 },
  // Aggregated metrics (anonymized)
  avgTimeToHire:  { avg: Number, median: Number, p25: Number, p10: Number, p75: Number },
  avgTimeToFill:  { avg: Number, median: Number, p25: Number, p10: Number },
  appsPerJob:     { avg: Number, median: Number, p25: Number, p10: Number },
  offerAcceptRate:{ avg: Number, median: Number, p25: Number, p10: Number },
  costPerHire:    { avg: Number, median: Number, p25: Number, p10: Number },
  attritionRate:  { avg: Number, median: Number, p25: Number, p10: Number },
  trainingHours:  { avg: Number, median: Number, p25: Number, p10: Number },
  promotionRate:  { avg: Number, median: Number, p25: Number, p10: Number },
  avgTenure:      { avg: Number, median: Number, p25: Number, p10: Number },
  // Salary ranges (anonymized)
  salaryEntry:    { avg: Number, p25: Number, p75: Number },
  salaryMid:      { avg: Number, p25: Number, p75: Number },
  salarySenior:   { avg: Number, p25: Number, p75: Number },
  salaryLead:     { avg: Number, p25: Number, p75: Number },
  // Scores
  avgRecruitmentScore: { type: Number, default: 0 },
  avgProductivityScore:{ type: Number, default: 0 },
  avgLearningScore:    { type: Number, default: 0 },
  avgRetentionScore:   { type: Number, default: 0 },
  avgAIScore:          { type: Number, default: 0 },
  avgOverallScore:     { type: Number, default: 0 },
  // Meta
  period:         { type: String, default: '' },
  lastUpdated:    { type: Date, default: Date.now },
  minimumParticipants: { type: Number, default: 5 },
}, { timestamps: true });

industryBenchmarkSchema.index({ industry: 1, companySize: 1, period: 1 });
export default mongoose.model('IndustryBenchmark', industryBenchmarkSchema);
