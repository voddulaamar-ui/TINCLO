import mongoose from 'mongoose';

const agentExecutionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  agentKey:       { type: String, required: true, index: true },
  triggeredBy:    { type: String, default: 'system' },
  input:          { type: mongoose.Schema.Types.Mixed, default: {} },
  output:         { type: mongoose.Schema.Types.Mixed, default: {} },
  status:         { type: String, enum: ['running', 'completed', 'failed', 'cancelled'], default: 'running', index: true },
  duration:       { type: Number, default: 0 },
  tokensUsed:     { type: Number, default: 0 },
  cost:           { type: Number, default: 0 },
  model:          { type: String, default: '' },
  error:          { type: String, default: '' },
}, { timestamps: true });

agentExecutionSchema.index({ organizationId: 1, agentKey: 1, createdAt: -1 });
export default mongoose.model('AgentExecution', agentExecutionSchema);
