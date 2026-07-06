import mongoose from 'mongoose';

const recruitmentForecastSchema = new mongoose.Schema({
  orgId:        { type: String, index: true, default: '' },
  type:         { type: String, enum: ['hiring_volume', 'offer_acceptance', 'cost', 'workload', 'time_to_fill'], required: true },
  department:   { type: String, default: '' },
  // Forecast data
  currentValue: { type: Number, default: 0 },
  forecastValue:{ type: Number, default: 0 },
  growthRate:   { type: Number, default: 0 },
  confidence:   { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  // Timeline
  forecasts: [{
    period:     { type: String },
    value:      { type: Number },
    confidence: { type: String },
  }],
  // Factors
  drivingFactors: [String],
  risks:          [String],
  recommendations:[String],
  // Meta
  period:       { type: String, default: '' },
  lastUpdated:  { type: Date, default: Date.now },
}, { timestamps: true });

recruitmentForecastSchema.index({ orgId: 1, type: 1 });
export default mongoose.model('RecruitmentForecast', recruitmentForecastSchema);
