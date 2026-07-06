import mongoose from 'mongoose';
const performanceReviewSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  employeeId:     { type: String, required: true, index: true },
  reviewerId:     { type: String, required: true },
  cycle:          { type: String, default: '' },  // 'Q3-2025', 'H1-2025', 'FY2025'
  type:           { type: String, enum: ['self', 'manager', 'peer', '360'], default: 'manager' },
  ratings: {
    technical:    { type: Number, min: 1, max: 5, default: null },
    communication:{ type: Number, min: 1, max: 5, default: null },
    teamwork:     { type: Number, min: 1, max: 5, default: null },
    leadership:   { type: Number, min: 1, max: 5, default: null },
    overall:      { type: Number, min: 1, max: 5, default: null },
  },
  strengths:      { type: String, default: '' },
  improvements:   { type: String, default: '' },
  goals:          { type: String, default: '' },
  recommendation: { type: String, enum: ['promotion', 'bonus', 'training', 'pip', 'none'], default: 'none' },
  status:         { type: String, enum: ['draft', 'submitted', 'acknowledged'], default: 'draft' },
}, { timestamps: true });

performanceReviewSchema.index({ organizationId: 1, employeeId: 1, cycle: 1 });
export default mongoose.model('PerformanceReview', performanceReviewSchema);
