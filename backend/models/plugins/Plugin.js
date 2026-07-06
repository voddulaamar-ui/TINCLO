import mongoose from 'mongoose';
const pluginSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  category:     { type: String, enum: ['plugin', 'theme', 'widget', 'report', 'ai_agent', 'integration', 'extension', 'workflow', 'automation'], default: 'plugin', index: true },
  version:      { type: String, default: '1.0.0' },
  author:       { type: String, default: '' },
  developerId:  { type: String, default: null, index: true },
  logo:         { type: String, default: '' },
  screenshots:  { type: [String], default: [] },
  homepage:     { type: String, default: '' },
  repository:   { type: String, default: '' },
  license:      { type: String, enum: ['free', 'freemium', 'paid', 'enterprise', 'trial'], default: 'free' },
  price:        { type: Number, default: 0 },
  currency:     { type: String, default: 'USD' },
  permissions:  { type: [String], default: [] },
  dependencies: { type: [String], default: [] },
  minPlatformVersion: { type: String, default: '1.0.0' },
  tags:         { type: [String], default: [] },
  releaseNotes: { type: String, default: '' },
  // Stats
  downloads:    { type: Number, default: 0 },
  rating:       { type: Number, default: 0 },
  ratingCount:  { type: Number, default: 0 },
  activeInstalls:{ type: Number, default: 0 },
  // Status
  status:       { type: String, enum: ['draft', 'review', 'approved', 'published', 'suspended', 'retired'], default: 'draft', index: true },
  isVerified:   { type: Boolean, default: false },
  isFeatured:   { type: Boolean, default: false },
  // Hooks & Events
  hooks:        { type: [String], default: [] },
  events:       { type: [String], default: [] },
  configSchema: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

pluginSchema.index({ name: 'text', description: 'text', tags: 'text' });
pluginSchema.index({ category: 1, status: 1, downloads: -1 });
export default mongoose.model('Plugin', pluginSchema);
