import mongoose from 'mongoose';

/**
 * Track AI API usage for rate limiting, billing, and analytics.
 */
const aiUsageSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  feature:   { type: String, required: true, index: true },   // 'chat', 'resume_score', 'cover_letter', etc.
  provider:  { type: String, default: 'local' },
  model:     { type: String, default: '' },
  tokens:    { type: Number, default: 0 },
  cost:      { type: Number, default: 0 },                    // estimated cost in USD
  success:   { type: Boolean, default: true },
  latencyMs: { type: Number, default: 0 },
}, { timestamps: true });

aiUsageSchema.index({ userId: 1, createdAt: -1 });
aiUsageSchema.index({ feature: 1, createdAt: -1 });

export default mongoose.model('AiUsage', aiUsageSchema);
