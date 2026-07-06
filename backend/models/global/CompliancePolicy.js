import mongoose from 'mongoose';
const compliancePolicySchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, index: true },  // 'gdpr', 'ccpa', 'dpdp'
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  regions:      { type: [String], default: [] },
  requirements: { type: [String], default: [] },
  isEnabled:    { type: Boolean, default: true },
  consentRequired: { type: Boolean, default: true },
  retentionDays:{ type: Number, default: 365 },
}, { timestamps: true });
export default mongoose.model('CompliancePolicy', compliancePolicySchema);
