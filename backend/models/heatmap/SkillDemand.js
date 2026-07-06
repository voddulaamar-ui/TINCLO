import mongoose from 'mongoose';

const skillDemandSchema = new mongoose.Schema({
  skill:        { type: String, required: true, index: true },
  // Demand metrics
  totalJobs:    { type: Number, default: 0 },
  growth:       { type: Number, default: 0 }, // percentage
  avgSalary:    { type: Number, default: 0 },
  medianSalary: { type: Number, default: 0 },
  demandLevel:  { type: String, enum: ['low', 'medium', 'high', 'very_high'], default: 'medium' },
  competitionIndex: { type: Number, default: 0 },
  remoteAvailability: { type: Number, default: 0 }, // percentage
  // Location breakdown
  topCities:    [{ city: String, country: String, jobs: Number, salary: Number }],
  topCompanies: [{ name: String, openings: Number }],
  topIndustries:[{ name: String, jobs: Number }],
  // Trends
  trendDirection: { type: String, enum: ['rising', 'stable', 'declining'], default: 'stable' },
  futureOutlook:  { type: String, enum: ['very_positive', 'positive', 'neutral', 'negative'], default: 'neutral' },
  relatedSkills:  [{ skill: String, correlation: Number }],
  // Experience
  experienceDistribution: {
    entry:  { type: Number, default: 0 },
    mid:    { type: Number, default: 0 },
    senior: { type: Number, default: 0 },
  },
  // Migration
  migrationFrom: [{ skill: String, percentage: Number }],
  migrationTo:   [{ skill: String, percentage: Number }],
  // Period
  period:       { type: String, default: '' },
  lastUpdated:  { type: Date, default: Date.now },
}, { timestamps: true });

skillDemandSchema.index({ skill: 1, period: 1 });
export default mongoose.model('SkillDemand', skillDemandSchema);
