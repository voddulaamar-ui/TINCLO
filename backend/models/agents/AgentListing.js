import mongoose from 'mongoose';

const agentListingSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  category:     { type: String, enum: ['recruitment', 'hrms', 'learning', 'assessment', 'career', 'analytics', 'automation', 'communication', 'compliance', 'finance', 'support', 'security', 'developer', 'custom'], default: 'recruitment', index: true },
  developer:    { type: String, default: 'TINCLO' },
  developerId:  { type: String, default: null },
  logo:         { type: String, default: '' },
  screenshots:  { type: [String], default: [] },
  version:      { type: String, default: '1.0.0' },
  capabilities: { type: [String], default: [] },
  tools:        { type: [String], default: [] },
  requiredPermissions: { type: [String], default: [] },
  // Pricing
  license:      { type: String, enum: ['free', 'freemium', 'paid', 'enterprise'], default: 'free' },
  price:        { type: Number, default: 0 },
  currency:     { type: String, default: 'USD' },
  billingType:  { type: String, enum: ['one_time', 'monthly', 'yearly', 'usage'], default: 'monthly' },
  // AI Config
  defaultModel: { type: String, default: 'gpt-3.5-turbo' },
  systemPrompt: { type: String, default: '' },
  knowledgeRequired: { type: Boolean, default: false },
  // Stats
  downloads:    { type: Number, default: 0 },
  activeInstalls:{ type: Number, default: 0 },
  rating:       { type: Number, default: 0 },
  ratingCount:  { type: Number, default: 0 },
  // Status
  status:       { type: String, enum: ['draft', 'review', 'published', 'suspended'], default: 'published', index: true },
  isFeatured:   { type: Boolean, default: false },
  isVerified:   { type: Boolean, default: false },
  tags:         { type: [String], default: [] },
  releaseNotes: { type: String, default: '' },
  minPlatformVersion: { type: String, default: '1.0.0' },
}, { timestamps: true });

agentListingSchema.index({ name: 'text', description: 'text', tags: 'text' });
agentListingSchema.index({ category: 1, status: 1, downloads: -1 });
export default mongoose.model('AgentListing', agentListingSchema);
