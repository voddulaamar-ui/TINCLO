import mongoose from 'mongoose';

const internalJobSchema = new mongoose.Schema({
  orgId:          { type: String, required: true, index: true },
  createdBy:      { type: String, required: true },
  // Job details
  title:          { type: String, required: true },
  description:    { type: String, default: '' },
  department:     { type: String, default: '' },
  team:           { type: String, default: '' },
  location:       { type: String, default: '' },
  type:           { type: String, enum: ['full_time', 'gig', 'project', 'rotation', 'mentorship', 'stretch_assignment'], default: 'full_time' },
  level:          { type: String, default: '' },
  // Requirements
  requiredSkills: { type: [String], default: [] },
  preferredSkills:{ type: [String], default: [] },
  minExperience:  { type: Number, default: 0 },
  // Visibility
  visibility:     { type: String, enum: ['all_employees', 'department', 'level', 'invite_only'], default: 'all_employees' },
  targetDepartments: { type: [String], default: [] },
  // Succession
  isSuccessionRole: { type: Boolean, default: false },
  successionFor:    { type: String, default: '' },
  // Stats
  applicants:     { type: Number, default: 0 },
  views:          { type: Number, default: 0 },
  // Timeline
  deadline:       { type: Date, default: null },
  startDate:      { type: Date, default: null },
  duration:       { type: String, default: '' },
  // Status
  status:         { type: String, enum: ['draft', 'open', 'in_progress', 'filled', 'closed'], default: 'open' },
  filledBy:       { type: String, default: '' },
  filledAt:       { type: Date, default: null },
}, { timestamps: true });

internalJobSchema.index({ orgId: 1, status: 1 });
export default mongoose.model('InternalJob', internalJobSchema);
