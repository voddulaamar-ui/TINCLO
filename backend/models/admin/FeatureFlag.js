import mongoose from 'mongoose';

const featureFlagSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  isEnabled:    { type: Boolean, default: true },
  rolloutPercent:{ type: Number, default: 100, min: 0, max: 100 },
  allowedOrgs:  { type: [String], default: [] },  // orgIds for gradual rollout
  category:     { type: String, default: 'general' },
  updatedBy:    { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('FeatureFlag', featureFlagSchema);
