import mongoose from 'mongoose';
const installedPluginSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  pluginId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Plugin', required: true },
  pluginKey:      { type: String, required: true, index: true },
  version:        { type: String, default: '1.0.0' },
  isEnabled:      { type: Boolean, default: true },
  settings:       { type: mongoose.Schema.Types.Mixed, default: {} },
  permissions:    { type: [String], default: [] },
  installedBy:    { type: String, default: '' },
  installedAt:    { type: Date, default: Date.now },
  lastUpdatedAt:  { type: Date, default: null },
  licenseKey:     { type: String, default: null },
  expiresAt:      { type: Date, default: null },
}, { timestamps: true });

installedPluginSchema.index({ organizationId: 1, pluginKey: 1 }, { unique: true });
export default mongoose.model('InstalledPlugin', installedPluginSchema);
