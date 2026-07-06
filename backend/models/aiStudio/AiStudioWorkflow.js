import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  id:     { type: String, required: true },
  type:   { type: String, enum: ['input', 'llm', 'tool', 'condition', 'output', 'knowledge', 'score', 'transform', 'human_review'], required: true },
  label:  { type: String, default: '' },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  position: { x: Number, y: Number },
  next:   { type: [String], default: [] },
}, { _id: false });

const aiStudioWorkflowSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  assistantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'AiAssistant', default: null },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  nodes:          { type: [nodeSchema], default: [] },
  edges:          [{ source: String, target: String }],
  status:         { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  version:        { type: Number, default: 1 },
  executionCount: { type: Number, default: 0 },
  createdBy:      { type: String, required: true },
}, { timestamps: true });

aiStudioWorkflowSchema.index({ organizationId: 1, status: 1 });
export default mongoose.model('AiStudioWorkflow', aiStudioWorkflowSchema);
