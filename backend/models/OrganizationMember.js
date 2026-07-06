import mongoose from 'mongoose';

/**
 * OrganizationMember — links a User to an Organization with a specific role.
 */
const orgMemberSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId:         { type: String, required: true, index: true },   // User.userId
  email:          { type: String, default: '' },

  role: {
    type: String,
    enum: ['owner', 'hr_manager', 'recruiter', 'interviewer', 'hiring_manager', 'viewer'],
    default: 'recruiter',
    index: true,
  },

  departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  officeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Office', default: null },

  // Permissions override (optional — if empty, use role defaults)
  permissions: {
    createJob:       { type: Boolean, default: null },
    editJob:         { type: Boolean, default: null },
    deleteJob:       { type: Boolean, default: null },
    approveJob:      { type: Boolean, default: null },
    viewCandidates:  { type: Boolean, default: null },
    manageCandidates:{ type: Boolean, default: null },
    scheduleInterview:{ type: Boolean, default: null },
    submitFeedback:  { type: Boolean, default: null },
    createOffer:     { type: Boolean, default: null },
    approveOffer:    { type: Boolean, default: null },
    manageTeam:      { type: Boolean, default: null },
    viewAnalytics:   { type: Boolean, default: null },
    manageSettings:  { type: Boolean, default: null },
    manageBilling:   { type: Boolean, default: null },
  },

  // Invitation tracking
  invitedBy:     { type: String, default: null },
  invitedAt:     { type: Date, default: null },
  acceptedAt:    { type: Date, default: null },
  status:        { type: String, enum: ['active', 'invited', 'deactivated'], default: 'active', index: true },

  // Workload tracking
  assignedCandidates: { type: Number, default: 0 },
  openJobs:           { type: Number, default: 0 },
}, { timestamps: true });

orgMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
orgMemberSchema.index({ organizationId: 1, role: 1 });
orgMemberSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model('OrganizationMember', orgMemberSchema);
