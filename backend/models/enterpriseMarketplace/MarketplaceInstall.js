import mongoose from 'mongoose';

const marketplaceInstallSchema = new mongoose.Schema({
  itemId:         { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceItem', required: true, index: true },
  orgId:          { type: String, required: true, index: true },
  installedBy:    { type: String, required: true },
  // Config
  version:        { type: String, default: '1.0.0' },
  config:         { type: mongoose.Schema.Types.Mixed, default: {} },
  // Status
  status:         { type: String, enum: ['active', 'disabled', 'uninstalled', 'pending_update'], default: 'active' },
  installedAt:    { type: Date, default: Date.now },
  lastUpdated:    { type: Date, default: null },
  // Usage
  usageCount:     { type: Number, default: 0 },
  lastUsed:       { type: Date, default: null },
  // Payment
  subscriptionId: { type: String, default: '' },
  paidUntil:      { type: Date, default: null },
}, { timestamps: true });

marketplaceInstallSchema.index({ orgId: 1, itemId: 1 }, { unique: true });
export default mongoose.model('MarketplaceInstall', marketplaceInstallSchema);
