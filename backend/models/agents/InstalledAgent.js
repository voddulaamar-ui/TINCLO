import mongoose from 'mongoose';

const installedAgentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  agentKey:       { type: String, required: true, index: true },
  agentId:        { type: mongoose.Schema.Types.ObjectId, ref: 'AgentListing', required: true },
  version:        { type: String, default: '1.0.0' },
  isEnabled:      { type: Boolean, default: true },
  // Custom config
  config: {
    model:        { type: String, default: '' },
    temperature:  { type: Number, default: 0.7 },
    systemPrompt: { type: String, default: '' },
    knowledgeBaseIds: [{ type: mongoose.Schema.Types.ObjectId }],
    tone:         { type: String, default: 'professional' },
    language:     { type: String, default: 'en' },
    autoApprove:  { type: Boolean, default: false },
    notifyOnComplete: { type: Boolean, default: true },
    customRules:  { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  permissions:    { type: [String], default: [] },
  // Stats
  executionCount: { type: Number, default: 0 },
  lastExecutedAt: { type: Date, default: null },
  successCount:   { type: Number, default: 0 },
  errorCount:     { type: Number, default: 0 },
  // Meta
  installedBy:    { type: String, default: '' },
  installedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

installedAgentSchema.index({ organizationId: 1, agentKey: 1 }, { unique: true });
export default mongoose.model('InstalledAgent', installedAgentSchema);
