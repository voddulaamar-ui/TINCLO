import mongoose from 'mongoose';
const kpiMetricSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  period:         { type: String, required: true, index: true },  // '2025-07', '2025-W27', '2025-07-05'
  periodType:     { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
  metrics: {
    jobsPosted:         { type: Number, default: 0 },
    applications:       { type: Number, default: 0 },
    shortlisted:        { type: Number, default: 0 },
    interviews:         { type: Number, default: 0 },
    offers:             { type: Number, default: 0 },
    offersAccepted:     { type: Number, default: 0 },
    hires:              { type: Number, default: 0 },
    avgTimeToHire:      { type: Number, default: 0 },  // days
    avgTimeToFill:      { type: Number, default: 0 },
    costPerHire:        { type: Number, default: 0 },
    offerAcceptanceRate:{ type: Number, default: 0 },  // %
    interviewConversion:{ type: Number, default: 0 },
    candidateSatisfaction:{ type: Number, default: 0 },
    recruiterProductivity:{ type: Number, default: 0 },
  },
}, { timestamps: true });

kpiMetricSchema.index({ organizationId: 1, period: 1, periodType: 1 }, { unique: true });
export default mongoose.model('KpiMetric', kpiMetricSchema);
