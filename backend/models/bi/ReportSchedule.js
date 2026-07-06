import mongoose from 'mongoose';
const reportScheduleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  userId:         { type: String, required: true, index: true },
  name:           { type: String, required: true },
  type:           { type: String, enum: ['hiring', 'recruiter', 'department', 'salary', 'skills', 'executive', 'custom'], default: 'hiring' },
  frequency:      { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'], default: 'weekly' },
  format:         { type: String, enum: ['pdf', 'excel', 'csv', 'json'], default: 'pdf' },
  recipients:     { type: [String], default: [] },  // email addresses
  filters:        { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive:       { type: Boolean, default: true },
  lastGeneratedAt:{ type: Date, default: null },
  nextGenerateAt: { type: Date, default: null },
}, { timestamps: true });

reportScheduleSchema.index({ isActive: 1, nextGenerateAt: 1 });
export default mongoose.model('ReportSchedule', reportScheduleSchema);
