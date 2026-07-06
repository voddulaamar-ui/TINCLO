import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  type:     { type: String, enum: ['trigger', 'condition', 'action', 'approval', 'delay', 'notification', 'integration', 'ai_decision', 'form', 'end'], required: true },
  label:    { type: String, default: '' },
  config:   { type: mongoose.Schema.Types.Mixed, default: {} },
  position: { x: Number, y: Number },
  next:     { type: [String], default: [] },         // node IDs
  branches: { type: mongoose.Schema.Types.Mixed, default: null },  // for condition/decision nodes
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  category:       { type: String, default: 'custom', index: true },
  nodes:          { type: [nodeSchema], default: [] },
  edges:          [{ source: String, target: String, label: String }],
  variables:      { type: mongoose.Schema.Types.Mixed, default: {} },
  trigger:        { type: String, default: 'manual' },  // event name or 'manual' or 'scheduled'
  schedule:       { type: String, default: '' },        // cron expression
  version:        { type: Number, default: 1 },
  status:         { type: String, enum: ['draft', 'published', 'archived', 'testing'], default: 'draft', index: true },
  isTemplate:     { type: Boolean, default: false },
  createdBy:      { type: String, required: true },
  permissions:    { type: [String], default: [] },      // roles allowed to execute
}, { timestamps: true });

workflowSchema.index({ organizationId: 1, status: 1 });
workflowSchema.index({ name: 'text', description: 'text', category: 'text' });
export default mongoose.model('Workflow', workflowSchema);
