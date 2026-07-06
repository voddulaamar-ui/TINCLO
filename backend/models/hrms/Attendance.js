import mongoose from 'mongoose';
const attendanceSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  employeeId:     { type: String, required: true, index: true },
  date:           { type: Date, required: true },
  checkIn:        { type: Date, default: null },
  checkOut:       { type: Date, default: null },
  workingHours:   { type: Number, default: 0 },
  overtime:       { type: Number, default: 0 },
  status:         { type: String, enum: ['present', 'absent', 'half_day', 'wfh', 'holiday', 'leave', 'late'], default: 'present' },
  method:         { type: String, enum: ['manual', 'qr', 'gps', 'biometric', 'web', 'mobile'], default: 'web' },
  location:       { type: String, default: '' },
  notes:          { type: String, default: '' },
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: -1 });
attendanceSchema.index({ organizationId: 1, date: -1 });
export default mongoose.model('Attendance', attendanceSchema);
