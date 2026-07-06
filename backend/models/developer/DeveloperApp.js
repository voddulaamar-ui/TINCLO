import mongoose from 'mongoose';

const developerAppSchema = new mongoose.Schema({
  developerId:   { type: String, required: true, index: true },
  name:          { type: String, required: true },
  description:   { type: String, default: '' },
  logo:          { type: String, default: '' },
  website:       { type: String, default: '' },
  // OAuth
  clientId:      { type: String, required: true, unique: true, index: true },
  clientSecret:  { type: String, required: true },
  redirectUris:  { type: [String], default: [] },
  scopes:        { type: [String], default: ['read'] },
  grantTypes:    { type: [String], default: ['authorization_code'] },
  // Status
  status:        { type: String, enum: ['active', 'suspended', 'pending', 'revoked'], default: 'active', index: true },
  isPublic:      { type: Boolean, default: false },
  environment:   { type: String, enum: ['production', 'sandbox'], default: 'sandbox' },
  // Usage
  requestCount:  { type: Number, default: 0 },
  lastUsedAt:    { type: Date, default: null },
  rateLimit:     { type: Number, default: 1000 },  // per hour
  // Webhooks for this app
  webhookUrl:    { type: String, default: '' },
  webhookSecret: { type: String, default: '' },
  webhookEvents: { type: [String], default: [] },
}, { timestamps: true });

developerAppSchema.index({ developerId: 1, status: 1 });
export default mongoose.model('DeveloperApp', developerAppSchema);
