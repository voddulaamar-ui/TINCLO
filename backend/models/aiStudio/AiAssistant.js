import mongoose from 'mongoose';

const aiAssistantSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  avatar:         { type: String, default: '' },
  welcomeMessage: { type: String, default: 'Hello! How can I help you today?' },
  language:       { type: String, default: 'en' },
  tone:           { type: String, enum: ['professional', 'friendly', 'formal', 'casual', 'technical'], default: 'professional' },
  // Prompt config
  systemPrompt:   { type: String, default: '' },
  instructions:   { type: String, default: '' },
  rules:          { type: [String], default: [] },
  examples:       [{ user: String, assistant: String }],
  outputFormat:    { type: String, default: '' },
  // Model config
  model:          { type: String, default: 'gpt-3.5-turbo' },
  provider:       { type: String, default: 'openai' },
  temperature:    { type: Number, default: 0.7 },
  maxTokens:      { type: Number, default: 1024 },
  // Knowledge
  knowledgeBaseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase' }],
  // Skills & Tools
  skills:         { type: [String], default: [] },
  tools:          { type: [String], default: [] },  // 'search_jobs', 'read_candidate', 'create_interview'
  // Status
  status:         { type: String, enum: ['draft', 'testing', 'active', 'paused', 'archived'], default: 'draft', index: true },
  version:        { type: Number, default: 1 },
  // Stats
  conversationCount: { type: Number, default: 0 },
  avgResponseTime:   { type: Number, default: 0 },
  satisfactionScore: { type: Number, default: 0 },
  // Permissions
  allowedRoles:   { type: [String], default: [] },
  createdBy:      { type: String, required: true },
}, { timestamps: true });

aiAssistantSchema.index({ organizationId: 1, status: 1 });
aiAssistantSchema.index({ name: 'text', description: 'text' });
export default mongoose.model('AiAssistant', aiAssistantSchema);
