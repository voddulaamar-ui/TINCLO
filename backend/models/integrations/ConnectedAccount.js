import mongoose from 'mongoose';

const connectedAccountSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  userId:         { type: String, required: true, index: true },
  providerKey:    { type: String, required: true, index: true },
  // OAuth tokens (encrypted at rest in production)
  accessToken:    { type: String, default: '' },
  refreshToken:   { type: String, default: '' },
  tokenExpiresAt: { type: Date, default: null },
  // Account info
  externalId:     { type: String, default: '' },
  externalEmail:  { type: String, default: '' },
  externalName:   { type: String, default: '' },
  externalAvatar: { type: String, default: '' },
  scopes:         { type: [String], default: [] },
  // Status
  status:         { type: String, enum: ['active', 'expired', 'revoked', 'error'], default: 'active', index: true },
  lastSyncAt:     { type: Date, default: null },
  lastError:      { type: String, default: '' },
  // Settings
  settings:       { type: mongoose.Schema.Types.Mixed, default: {} },
  syncFrequency:  { type: String, enum: ['realtime', 'hourly', 'daily', 'manual'], default: 'manual' },
  isEnabled:      { type: Boolean, default: true },
}, { timestamps: true });

connectedAccountSchema.index({ userId: 1, providerKey: 1 }, { unique: true });
connectedAccountSchema.index({ organizationId: 1, providerKey: 1 });
export default mongoose.model('ConnectedAccount', connectedAccountSchema);
