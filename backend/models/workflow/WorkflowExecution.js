import mongoose from 'mongoose';

const stepLogSchema = new mongoose.Schema({
  nodeId:    { type: String, required: true },
  nodeType:  { type: String, default: '' },
  label:     { type: String, default: '' },
  status:    { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'waiting_approval'], default: 'pending' },
  startedAt: { type: Date, default: null },
  completedAt:{ type: Date, default: null },
  output:    { type: mongoose.Schema.Types.Mixed, default: null },
  error:     { type: String, default: '' },
}, { _id: true });

const workflowExecutionSchema = new mongoose.Schema({
  workflowId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  triggeredBy:    { type: String, default: 'system' },
  triggerEvent:   { type: String, default: '' },
  triggerData:    { type: mongoose.Schema.Types.Mixed, default: {} },
  status:         { type: String, enum: ['running', 'completed', 'failed', 'cancelled', 'paused', 'waiting_approval'], default: 'running', index: true },
  currentNodeId:  { type: String, default: null },
  steps:          { type: [stepLogSchema], default: [] },
  variables:      { type: mongoose.Schema.Types.Mixed, default: {} },
  startedAt:      { type: Date, default: Date.now },
  completedAt:    { type: Date, default: null },
  duration:       { type: Number, default: 0 },  // ms
  retryCount:     { type: Number, default: 0 },
  error:          { type: String, default: '' },
}, { timestamps: true });

workflowExecutionSchema.index({ workflowId: 1, status: 1, startedAt: -1 });
workflowExecutionSchema.index({ organizationId: 1, startedAt: -1 });
export default mongoose.model('WorkflowExecution', workflowExecutionSchema);
