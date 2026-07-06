import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  type:     { type: String, enum: ['trigger', 'condition', 'action', 'delay', 'loop', 'integration', 'ai_action', 'approval', 'file', 'data', 'notification', 'end'], required: true },
  label:    { type: String, default: '' },
  config:   { type: mongoose.Schema.Types.Mixed, default: {} },
  position: { x: Number, y: Number },
  next:     { type: [String], default: [] },
  branches: { type: mongoose.Schema.Types.Mixed, default: null },
  errorHandler: { type: String, enum: ['retry', 'fallback', 'ignore', 'escalate', 'stop'], default: 'stop' },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
}, { _id: false });

const automationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  category:       { type: String, default: 'custom', index: true },
  steps:          { type: [stepSchema], default: [] },
  edges:          [{ source: String, target: String, label: String }],
  variables:      { type: mongoose.Schema.Types.Mixed, default: {} },
  // Trigger config
  triggerType:    { type: String, enum: ['event', 'schedule', 'webhook', 'manual'], default: 'event' },
  triggerEvent:   { type: String, default: '' },
  schedule:       { type: String, default: '' },     // cron expression
  webhookUrl:     { type: String, default: '' },
  // Status
  version:        { type: Number, default: 1 },
  status:         { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft', index: true },
  isTemplate:     { type: Boolean, default: false },
  // Stats
  executionCount: { type: Number, default: 0 },
  lastExecutedAt: { type: Date, default: null },
  successCount:   { type: Number, default: 0 },
  failureCount:   { type: Number, default: 0 },
  // Meta
  createdBy:      { type: String, required: true },
  permissions:    { type: [String], default: [] },
  tags:           { type: [String], default: [] },
}, { timestamps: true });

automationSchema.index({ organizationId: 1, status: 1 });
automationSchema.index({ name: 'text', description: 'text', tags: 'text' });
automationSchema.index({ triggerEvent: 1, status: 1 });
export default mongoose.model('Automation', automationSchema);
