import mongoose from 'mongoose';

const salaryAnalyticsSchema = new mongoose.Schema({
  // Identifiers
  role:         { type: String, required: true, index: true },
  skill:        { type: String, default: '' },
  country:      { type: String, default: '' },
  city:         { type: String, default: '' },
  industry:     { type: String, default: '' },
  // Salary data
  minSalary:    { type: Number, default: 0 },
  maxSalary:    { type: Number, default: 0 },
  avgSalary:    { type: Number, default: 0 },
  medianSalary: { type: Number, default: 0 },
  currency:     { type: String, default: 'INR' },
  // Experience-wise
  entrySalary:  { min: Number, max: Number, avg: Number },
  midSalary:    { min: Number, max: Number, avg: Number },
  seniorSalary: { min: Number, max: Number, avg: Number },
  leadSalary:   { min: Number, max: Number, avg: Number },
  // Trends
  growthRate:   { type: Number, default: 0 },
  yearOverYear: { type: Number, default: 0 },
  // Company size breakdown
  startupSalary:    { type: Number, default: 0 },
  smeSalary:        { type: Number, default: 0 },
  enterpriseSalary: { type: Number, default: 0 },
  // Remote premium
  remotePremium:    { type: Number, default: 0 },
  // Period
  period:       { type: String, default: '' },
  lastUpdated:  { type: Date, default: Date.now },
}, { timestamps: true });

salaryAnalyticsSchema.index({ role: 1, city: 1, period: 1 });
export default mongoose.model('SalaryAnalytics', salaryAnalyticsSchema);
