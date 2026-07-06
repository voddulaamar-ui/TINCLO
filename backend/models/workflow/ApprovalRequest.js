import mongoose from 'mongoose';

const approvalRequestSchema = new mongoose.Schema({
  workflowId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  executionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowExecution', required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  nodeId:         { type: String, required: true },
  title:          { type: String, default: 'Approval Required' },
  description:    { type: String, default: '' },
  requestedBy:    { type: String, default: '' },
  approvers:      { type: [String], default: [] },     // userIds or roles
  approvalType:   { type: String, enum: ['sequential', 'parallel', 'any_one', 'majority'], default: 'any_one' },
  status:         { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending', index: true },
  responses:      [{ userId: String, decision: { type: String, enum: ['approved', 'rejected'] }, comment: String, at: { type: Date, default: Date.now } }],
  deadline:       { type: Date, default: null },
  resolvedAt:     { type: Date, default: null },
}, { timestamps: true });

approvalRequestSchema.index({ approvers: 1, status: 1 });
export default mongoose.model('ApprovalRequest', approvalRequestSchema);
