import mongoose from 'mongoose';

const internalApplicationSchema = new mongoose.Schema({
  orgId:          { type: String, required: true, index: true },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'InternalJob', required: true },
  employeeId:     { type: String, required: true },
  employeeName:   { type: String, default: '' },
  currentRole:    { type: String, default: '' },
  currentDepartment: { type: String, default: '' },
  // Application
  coverNote:      { type: String, default: '' },
  skills:         { type: [String], default: [] },
  experience:     { type: Number, default: 0 },
  managerApproval:{ type: String, enum: ['pending', 'approved', 'denied', 'not_required'], default: 'not_required' },
  managerNote:    { type: String, default: '' },
  // Evaluation
  matchScore:     { type: Number, default: 0 },
  status:         { type: String, enum: ['applied', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn'], default: 'applied' },
  feedback:       { type: String, default: '' },
  // Movement
  movementType:   { type: String, enum: ['lateral', 'promotion', 'rotation', 'gig', 'stretch'], default: 'lateral' },
  effectiveDate:  { type: Date, default: null },
}, { timestamps: true });

internalApplicationSchema.index({ orgId: 1, employeeId: 1 });
internalApplicationSchema.index({ jobId: 1, status: 1 });
export default mongoose.model('InternalApplication', internalApplicationSchema);
