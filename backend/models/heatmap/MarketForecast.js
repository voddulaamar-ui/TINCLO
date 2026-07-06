import mongoose from 'mongoose';

const marketForecastSchema = new mongoose.Schema({
  // Scope
  type:         { type: String, enum: ['skill', 'location', 'industry', 'role'], required: true },
  name:         { type: String, required: true, index: true },
  country:      { type: String, default: '' },
  // Forecast data
  currentDemand:{ type: Number, default: 0 },
  forecastDemand: { type: Number, default: 0 },
  growthRate:   { type: Number, default: 0 },
  confidence:   { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  // Timeline
  forecasts: [{
    period:     { type: String }, // e.g. '2026-Q3', '2027-Q1'
    demand:     { type: Number },
    salary:     { type: Number },
    growth:     { type: Number },
  }],
  // Factors
  drivingFactors: [{ factor: String, impact: String }],
  risks:        [{ risk: String, severity: String }],
  // AI summary
  aiSummary:    { type: String, default: '' },
  recommendations: [String],
  // Meta
  period:       { type: String, default: '' },
  lastUpdated:  { type: Date, default: Date.now },
}, { timestamps: true });

marketForecastSchema.index({ type: 1, name: 1 });
export default mongoose.model('MarketForecast', marketForecastSchema);
