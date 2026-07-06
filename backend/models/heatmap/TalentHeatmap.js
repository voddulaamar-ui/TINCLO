import mongoose from 'mongoose';

const talentHeatmapSchema = new mongoose.Schema({
  // Location
  country:      { type: String, required: true, index: true },
  state:        { type: String, default: '' },
  city:         { type: String, default: '' },
  region:       { type: String, default: '' },
  coordinates:  { lat: { type: Number }, lng: { type: Number } },
  // Metrics
  totalJobs:    { type: Number, default: 0 },
  activeCompanies: { type: Number, default: 0 },
  talentPool:   { type: Number, default: 0 },
  avgSalary:    { type: Number, default: 0 },
  medianSalary: { type: Number, default: 0 },
  remoteJobs:   { type: Number, default: 0 },
  hybridJobs:   { type: Number, default: 0 },
  officeJobs:   { type: Number, default: 0 },
  hiringGrowth: { type: Number, default: 0 }, // percentage
  competitionIndex: { type: Number, default: 0 }, // 0-100
  demandLevel:  { type: String, enum: ['low', 'medium', 'high', 'very_high'], default: 'medium' },
  // Top data
  topSkills:    [{ skill: String, demand: Number, growth: Number }],
  topCompanies: [{ name: String, openings: Number }],
  topIndustries:[{ name: String, jobs: Number }],
  // Experience breakdown
  experienceBreakdown: {
    fresher:    { type: Number, default: 0 },
    junior:     { type: Number, default: 0 },
    mid:        { type: Number, default: 0 },
    senior:     { type: Number, default: 0 },
    lead:       { type: Number, default: 0 },
  },
  // Cost of living
  costOfLiving: {
    rentIndex:  { type: Number, default: 0 },
    foodIndex:  { type: Number, default: 0 },
    transportIndex: { type: Number, default: 0 },
    overallIndex: { type: Number, default: 0 },
    purchasingPower: { type: Number, default: 0 },
  },
  // Period
  period:       { type: String, default: '' }, // e.g. '2026-Q2'
  lastUpdated:  { type: Date, default: Date.now },
}, { timestamps: true });

talentHeatmapSchema.index({ country: 1, state: 1, city: 1 });
talentHeatmapSchema.index({ period: 1 });
export default mongoose.model('TalentHeatmap', talentHeatmapSchema);
