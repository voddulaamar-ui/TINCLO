import mongoose from 'mongoose';
const payrollSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  employeeId:     { type: String, required: true, index: true },
  period:         { type: String, required: true },  // '2025-07'
  basic:          { type: Number, default: 0 },
  hra:            { type: Number, default: 0 },
  allowances:     { type: Number, default: 0 },
  bonus:          { type: Number, default: 0 },
  deductions:     { type: Number, default: 0 },
  tax:            { type: Number, default: 0 },
  pf:             { type: Number, default: 0 },
  esi:            { type: Number, default: 0 },
  netPay:         { type: Number, default: 0 },
  grossPay:       { type: Number, default: 0 },
  status:         { type: String, enum: ['draft', 'processed', 'paid', 'held'], default: 'draft', index: true },
  paidAt:         { type: Date, default: null },
  payslipUrl:     { type: String, default: null },
}, { timestamps: true });

payrollSchema.index({ organizationId: 1, period: 1 });
payrollSchema.index({ employeeId: 1, period: 1 }, { unique: true });
export default mongoose.model('Payroll', payrollSchema);
