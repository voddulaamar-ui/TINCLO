import mongoose from 'mongoose';

const stepLogSchema = new mongoose.Schema({
  stepId:     { type: String, required: true },
  stepType:   { type: String, default: '' },
  label:      { type: String, default: '' },
  status:     { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'waiting'], default: 'pending' },
  startedAt:  { type: Date, default: null },
  completedAt:{ type: Date, default: null },
  duration:   { type: Number, default: 0 },
  input:      { type: mongoose.Schema.Types.Mixed, default: null },
  output:     { type: mongoose.Schema.Types.Mixed, default: null },
  error:      { type: String, default: '' },
  retryCount: { type: Number, default: 0 },
}, { _id: true });

const automationExecutionSchema = new mongoose.Schema({
  automationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Automation', required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  triggeredBy:    { type: String, default: 'system' },
  triggerType:    { type: String, default: '' },
  triggerData:    { type: mongoose.Schema.Types.Mixed, default: {} },
  status:         { type: String, enum: ['queued', 'running', 'completed', 'failed', 'cancelled', 'paused'], default: 'queued', index: true },
  currentStepId:  { type: String, default: null },
  steps:          { type: [stepLogSchema], default: [] },
  variables:      { type: mongoose.Schema.Types.Mixed, default: {} },
  startedAt:      { type: Date, default: null },
  completedAt:    { type: Date, default: null },
  duration:       { type: Number, default: 0 },
  error:          { type: String, default: '' },
  retryCount:     { type: Number, default: 0 },
}, { timestamps: true });

automationExecutionSchema.index({ automationId: 1, status: 1, startedAt: -1 });
automationExecutionSchema.index({ organizationId: 1, startedAt: -1 });
export default mongoose.model('AutomationExecution', automationExecutionSchema);
