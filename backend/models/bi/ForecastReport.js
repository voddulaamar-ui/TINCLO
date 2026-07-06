import mongoose from 'mongoose';
const forecastReportSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  type:           { type: String, enum: ['hiring_growth', 'skill_demand', 'salary_trend', 'attrition', 'workforce'], default: 'hiring_growth' },
  period:         { type: String, default: '' },
  predictions:    { type: [mongoose.Schema.Types.Mixed], default: [] },
  confidence:     { type: Number, default: 0 },
  generatedAt:    { type: Date, default: Date.now },
  generatedBy:    { type: String, default: 'system' },
}, { timestamps: true });

forecastReportSchema.index({ organizationId: 1, type: 1, generatedAt: -1 });
export default mongoose.model('ForecastReport', forecastReportSchema);
