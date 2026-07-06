import mongoose from 'mongoose';
const leaveRequestSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  employeeId:     { type: String, required: true, index: true },
  leaveType:      { type: String, enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'compensatory', 'wfh', 'lop', 'special'], required: true },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  days:           { type: Number, default: 1 },
  reason:         { type: String, default: '' },
  status:         { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  approvedBy:     { type: String, default: null },
  approvedAt:     { type: Date, default: null },
  rejectionReason:{ type: String, default: '' },
}, { timestamps: true });

leaveRequestSchema.index({ employeeId: 1, status: 1, startDate: -1 });
export default mongoose.model('LeaveRequest', leaveRequestSchema);
