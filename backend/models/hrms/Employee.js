import mongoose from 'mongoose';
const employeeSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId:         { type: String, required: true, index: true },
  employeeId:     { type: String, required: true, index: true },
  name:           { type: String, required: true },
  email:          { type: String, default: '' },
  phone:          { type: String, default: '' },
  profilePhoto:   { type: String, default: null },
  dateOfBirth:    { type: Date, default: null },
  gender:         { type: String, default: '' },
  nationality:    { type: String, default: '' },
  address:        { type: String, default: '' },
  emergencyContact:{ name: String, phone: String, relation: String },
  joiningDate:    { type: Date, default: Date.now },
  employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern', 'freelance'], default: 'full_time' },
  departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  designation:    { type: String, default: '' },
  managerId:      { type: String, default: null },
  officeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Office', default: null },
  workLocation:   { type: String, default: '' },
  skills:         { type: [String], default: [] },
  salary:         { basic: Number, hra: Number, allowances: Number, total: Number, currency: { type: String, default: 'INR' } },
  bankDetails:    { bankName: String, accountNumber: String, ifsc: String },
  taxId:          { type: String, default: '' },
  status:         { type: String, enum: ['active', 'on_leave', 'probation', 'notice_period', 'suspended', 'resigned', 'retired'], default: 'active', index: true },
  convertedFromCandidate: { type: String, default: null },
}, { timestamps: true });

employeeSchema.index({ organizationId: 1, status: 1 });
employeeSchema.index({ organizationId: 1, departmentId: 1 });
employeeSchema.index({ name: 'text', email: 'text', designation: 'text' });
export default mongoose.model('Employee', employeeSchema);
