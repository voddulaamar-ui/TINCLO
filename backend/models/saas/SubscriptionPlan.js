import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, index: true }, // 'free', 'starter', 'pro', 'enterprise'
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  monthlyPrice: { type: Number, default: 0 },
  yearlyPrice:  { type: Number, default: 0 },
  currency:     { type: String, default: 'INR' },
  // Limits
  limits: {
    recruiters:     { type: Number, default: 1 },
    activeJobs:     { type: Number, default: 5 },
    applications:   { type: Number, default: 100 },
    storageMb:      { type: Number, default: 500 },
    aiRequests:     { type: Number, default: 0 },
    emailCredits:   { type: Number, default: 50 },
    apiRequests:    { type: Number, default: 0 },
    careerPages:    { type: Number, default: 0 },
  },
  // Feature flags
  features: {
    analytics:        { type: Boolean, default: false },
    advancedAnalytics:{ type: Boolean, default: false },
    aiFeatures:       { type: Boolean, default: false },
    customBranding:   { type: Boolean, default: false },
    apiAccess:        { type: Boolean, default: false },
    webhooks:         { type: Boolean, default: false },
    interviewScheduling:{ type: Boolean, default: true },
    automation:       { type: Boolean, default: false },
    sso:              { type: Boolean, default: false },
    auditLogs:        { type: Boolean, default: false },
    whiteLabel:       { type: Boolean, default: false },
    prioritySupport:  { type: Boolean, default: false },
    dedicatedSupport: { type: Boolean, default: false },
  },
  trialDays:    { type: Number, default: 0 },
  isActive:     { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
