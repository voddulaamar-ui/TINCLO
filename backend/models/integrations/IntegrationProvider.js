import mongoose from 'mongoose';

const integrationProviderSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, index: true }, // 'google', 'zoom', 'slack'
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  logo:         { type: String, default: '' },
  category:     { type: String, enum: ['communication', 'calendar', 'storage', 'hr', 'ats', 'crm', 'productivity', 'developer', 'auth', 'analytics', 'payments', 'email', 'sms', 'video', 'ai'], index: true },
  website:      { type: String, default: '' },
  features:     { type: [String], default: [] },
  requiredScopes:{ type: [String], default: [] },
  oauthUrl:     { type: String, default: '' },
  tokenUrl:     { type: String, default: '' },
  apiBaseUrl:   { type: String, default: '' },
  isActive:     { type: Boolean, default: true, index: true },
  isPremium:    { type: Boolean, default: false },
  docsUrl:      { type: String, default: '' },
  configSchema: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model('IntegrationProvider', integrationProviderSchema);
