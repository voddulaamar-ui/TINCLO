import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  key:            { type: String, required: true, unique: true, index: true },
  name:           { type: String, default: 'Default Key' },
  createdBy:      { type: String, required: true },
  lastUsedAt:     { type: Date, default: null },
  requestCount:   { type: Number, default: 0 },
  rateLimit:      { type: Number, default: 1000 },   // per hour
  isActive:       { type: Boolean, default: true },
  expiresAt:      { type: Date, default: null },
  scopes:         { type: [String], default: ['read'] },  // 'read', 'write', 'admin'
}, { timestamps: true });

export default mongoose.model('ApiKey', apiKeySchema);
