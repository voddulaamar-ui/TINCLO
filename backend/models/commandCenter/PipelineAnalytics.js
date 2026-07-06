import mongoose from 'mongoose';

const pipelineAnalyticsSchema = new mongoose.Schema({
  orgId:        { type: String, index: true, default: '' },
  period:       { type: String, default: '' }, // e.g. '2026-07'
  // Pipeline stages
  stages: [{
    name:       { type: String },
    count:      { type: Number, default: 0 },
    avgDays:    { type: Number, default: 0 },
    dropRate:   { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
  }],
  // Funnel totals
  totalApplications: { type: Number, default: 0 },
  totalShortlisted:  { type: Number, default: 0 },
  totalInterviewed:  { type: Number, default: 0 },
  totalSelected:     { type: Number, default: 0 },
  totalJoined:       { type: Number, default: 0 },
  // KPIs
  avgTimeToHire:     { type: Number, default: 0 },
  avgCostPerHire:    { type: Number, default: 0 },
  hiringSuccessRate: { type: Number, default: 0 },
  offerAcceptRate:   { type: Number, default: 0 },
  qualityOfHire:     { type: Number, default: 0 },
  // Department breakdown
  departments: [{
    name:       { type: String },
    openPositions: { type: Number, default: 0 },
    applications:  { type: Number, default: 0 },
    interviews:    { type: Number, default: 0 },
    offers:        { type: Number, default: 0 },
    joined:        { type: Number, default: 0 },
    hiringCost:    { type: Number, default: 0 },
  }],
  lastUpdated:  { type: Date, default: Date.now },
}, { timestamps: true });

pipelineAnalyticsSchema.index({ orgId: 1, period: 1 });
export default mongoose.model('PipelineAnalytics', pipelineAnalyticsSchema);
