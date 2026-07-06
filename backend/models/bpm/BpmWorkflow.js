import mongoose from 'mongoose';

const stageSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  type:     { type: String, enum: ['start', 'task', 'condition', 'approval', 'ai_decision', 'integration', 'notification', 'delay', 'loop', 'subprocess', 'parallel', 'end'], required: true },
  label:    { type: String, default: '' },
  config:   { type: mongoose.Schema.Types.Mixed, default: {} },
  position: { x: Number, y: Number },
  next:     { type: [String], default: [] },
  branches: { type: mongoose.Schema.Types.Mixed, default: null },
  sla:      { hours: { type: Number, default: 0 }, escalateTo: { type: String, default: '' } },
  assignee: { type: String, default: '' },  // role, userId, or expression
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
}, { _id: false });

const bpmWorkflowSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  category:       { type: String, default: 'recruitment', index: true },
  stages:         { type: [stageSchema], default: [] },
  edges:          [{ source: String, target: String, label: String, condition: String }],
  variables:      { type: mongoose.Schema.Types.Mixed, default: {} },
  forms:          { type: mongoose.Schema.Types.Mixed, default: {} },
  // Config
  version:        { type: Number, default: 1 },
  status:         { type: String, enum: ['draft', 'testing', 'published', 'archived'], default: 'draft', index: true },
  isTemplate:     { type: Boolean, default: false },
  // Governance
  owner:          { type: String, default: '' },
  publishedBy:    { type: String, default: '' },
  publishedAt:    { type: Date, default: null },
  // SLA
  defaultSlaHours:{ type: Number, default: 0 },
  escalationPolicy:{ type: String, default: '' },
  // Stats
  executionCount: { type: Number, default: 0 },
  avgDuration:    { type: Number, default: 0 },
  successRate:    { type: Number, default: 0 },
  createdBy:      { type: String, required: true },
}, { timestamps: true });

bpmWorkflowSchema.index({ organizationId: 1, status: 1, category: 1 });
bpmWorkflowSchema.index({ name: 'text', description: 'text' });
export default mongoose.model('BpmWorkflow', bpmWorkflowSchema);
