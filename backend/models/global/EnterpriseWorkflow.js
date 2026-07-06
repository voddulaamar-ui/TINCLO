import mongoose from 'mongoose';
const stepSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  approver:   { type: String, default: '' },  // role or userId
  action:     { type: String, enum: ['approve', 'review', 'notify'], default: 'approve' },
  timeout:    { type: Number, default: 0 },   // hours, 0 = no timeout
}, { _id: false });

const enterpriseWorkflowSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  type:           { type: String, enum: ['job_approval', 'offer_approval', 'interview_approval', 'document_approval', 'expense_approval'], required: true, index: true },
  name:           { type: String, required: true },
  steps:          { type: [stepSchema], default: [] },
  isActive:       { type: Boolean, default: true },
  createdBy:      { type: String, default: '' },
}, { timestamps: true });

enterpriseWorkflowSchema.index({ organizationId: 1, type: 1 });
export default mongoose.model('EnterpriseWorkflow', enterpriseWorkflowSchema);
