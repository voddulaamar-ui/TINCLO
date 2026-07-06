import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, unique: true },
  slug:           { type: String, required: true, trim: true, unique: true, lowercase: true, index: true },
  logo:           { type: String, default: null },
  coverBanner:    { type: String, default: null },
  website:        { type: String, default: '' },
  industry:       { type: String, default: '' },
  companySize:    { type: String, default: '' },        // '1-10', '11-50', '51-200', '201-500', '500+'
  headquarters:   { type: String, default: '' },
  foundedYear:    { type: Number, default: null },
  description:    { type: String, default: '' },
  socialLinks: {
    linkedin: { type: String, default: '' },
    twitter:  { type: String, default: '' },
    github:   { type: String, default: '' },
    facebook: { type: String, default: '' },
  },
  emailDomain:    { type: String, default: '' },        // e.g. 'google.com' — for auto-join
  subscriptionPlan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
  status:         { type: String, enum: ['active', 'suspended', 'pending'], default: 'active', index: true },
  createdBy:      { type: String, required: true },     // User.userId of the creator

  // Branding
  brandColors: {
    primary:   { type: String, default: '#667eea' },
    secondary: { type: String, default: '#764ba2' },
  },
  contactEmail: { type: String, default: '' },

  // Settings
  settings: {
    approvalWorkflow:   { type: Boolean, default: false },  // require job approval before publish
    autoAssignment:     { type: Boolean, default: false },  // auto-assign candidates to recruiters
    defaultInterviewProcess: { type: [String], default: ['Applied', 'Screening', 'Technical', 'HR', 'Offer'] },
    allowedEmailDomains:{ type: [String], default: [] },
    sessionTimeout:     { type: Number, default: 30 },       // minutes
  },
}, { timestamps: true });

organizationSchema.index({ name: 'text', industry: 'text', description: 'text' });

export default mongoose.model('Organization', organizationSchema);
