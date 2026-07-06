import mongoose from 'mongoose';

const benchmarkAlertSchema = new mongoose.Schema({
  orgId:        { type: String, required: true, index: true },
  type:         { type: String, enum: [
    'hiring_speed_drop', 'offer_accept_fall', 'salary_below_market',
    'high_attrition', 'low_learning', 'department_decline',
    'cost_increase', 'rank_drop', 'custom',
  ], required: true },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  severity:     { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  metric:       { type: String, default: '' },
  currentValue: { type: Number, default: 0 },
  benchmarkValue: { type: Number, default: 0 },
  threshold:    { type: Number, default: 10 },
  status:       { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
  recommendations: [String],
}, { timestamps: true });

benchmarkAlertSchema.index({ orgId: 1, status: 1, createdAt: -1 });
export default mongoose.model('BenchmarkAlert', benchmarkAlertSchema);
