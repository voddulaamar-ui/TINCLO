import mongoose from 'mongoose';

const marketplaceItemSchema = new mongoose.Schema({
  // Publisher
  publisherId:    { type: String, required: true, index: true },
  publisherName:  { type: String, default: '' },
  publisherOrg:   { type: String, default: '' },
  // Item details
  name:           { type: String, required: true },
  slug:           { type: String, unique: true },
  description:    { type: String, default: '' },
  shortDesc:      { type: String, default: '' },
  category:       { type: String, enum: ['hr_module', 'industry_solution', 'integration', 'theme', 'template', 'workflow_pack', 'ai_agent', 'report', 'dashboard', 'custom'], required: true },
  subcategory:    { type: String, default: '' },
  // Media
  icon:           { type: String, default: '' },
  banner:         { type: String, default: '' },
  screenshots:    [{ url: String, caption: String }],
  demoUrl:        { type: String, default: '' },
  // Versioning
  version:        { type: String, default: '1.0.0' },
  changelog:      [{ version: String, date: Date, notes: String }],
  // Pricing
  pricing:        { type: String, enum: ['free', 'freemium', 'paid', 'subscription', 'revenue_share'], default: 'free' },
  price:          { type: Number, default: 0 },
  currency:       { type: String, default: 'USD' },
  revenueSharePercent: { type: Number, default: 70 }, // developer gets this %
  // Features
  features:       { type: [String], default: [] },
  tags:           { type: [String], default: [] },
  industries:     { type: [String], default: [] },
  // Compatibility
  minPlan:        { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
  dependencies:   { type: [String], default: [] },
  // Permissions
  permissionsRequired: { type: [String], default: [] },
  // Stats
  installs:       { type: Number, default: 0 },
  activeInstalls: { type: Number, default: 0 },
  rating:         { type: Number, default: 0 },
  reviewCount:    { type: Number, default: 0 },
  views:          { type: Number, default: 0 },
  // Revenue
  totalRevenue:   { type: Number, default: 0 },
  developerPayout:{ type: Number, default: 0 },
  // Status
  status:         { type: String, enum: ['draft', 'in_review', 'published', 'suspended', 'deprecated'], default: 'draft' },
  isVerified:     { type: Boolean, default: false },
  isFeatured:     { type: Boolean, default: false },
  publishedAt:    { type: Date, default: null },
}, { timestamps: true });

marketplaceItemSchema.index({ category: 1, status: 1 });
marketplaceItemSchema.index({ tags: 1 });
export default mongoose.model('MarketplaceItem', marketplaceItemSchema);
