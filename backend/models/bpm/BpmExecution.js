import mongoose from 'mongoose';

const taskLogSchema = new mongoose.Schema({
  stageId:     { type: String, required: true },
  stageType:   { type: String, default: '' },
  label:       { type: String, default: '' },
  assignee:    { type: String, default: '' },
  status:      { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'escalated', 'waiting_approval'], default: 'pending' },
  startedAt:   { type: Date, default: null },
  completedAt: { type: Date, default: null },
  slaDeadline: { type: Date, default: null },
  slaBreached: { type: Boolean, default: false },
  output:      { type: mongoose.Schema.Types.Mixed, default: null },
  error:       { type: String, default: '' },
  duration:    { type: Number, default: 0 },
}, { _id: true });

const bpmExecutionSchema = new mongoose.Schema({
  workflowId:     { type: mongoose.Schema.Types.ObjectId, ref: 'BpmWorkflow', required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  triggeredBy:    { type: String, default: 'system' },
  triggerData:    { type: mongoose.Schema.Types.Mixed, default: {} },
  status:         { type: String, enum: ['running', 'completed', 'failed', 'cancelled', 'paused', 'waiting_approval', 'escalated'], default: 'running', index: true },
  currentStageId: { type: String, default: null },
  tasks:          { type: [taskLogSchema], default: [] },
  variables:      { type: mongoose.Schema.Types.Mixed, default: {} },
  startedAt:      { type: Date, default: Date.now },
  completedAt:    { type: Date, default: null },
  duration:       { type: Number, default: 0 },
  slaBreaches:    { type: Number, default: 0 },
  error:          { type: String, default: '' },
}, { timestamps: true });

bpmExecutionSchema.index({ workflowId: 1, status: 1, startedAt: -1 });
bpmExecutionSchema.index({ organizationId: 1, status: 1 });
export default mongoose.model('BpmExecution', bpmExecutionSchema);
