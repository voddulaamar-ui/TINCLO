import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  // ── External job tracking ─────────────────────────────────────────────────
  externalId: {
    type: String, trim: true, unique: true, sparse: true, index: true,
  },

  // ── Core fields ──────────────────────────────────────────────────────────
  title:       { type: String, required: true, trim: true },
  company:     { type: String, required: true, trim: true },
  description: { type: String, required: true },
  salary:      { type: String, default: 'Salary not disclosed' },
  location:    { type: String, required: true },

  // ── Phase 1: Extended job fields ─────────────────────────────────────────
  companyDescription: { type: String, default: '' },
  companyLogo:        { type: String, default: null },
  domain:             { type: String, default: '' },   // 'Full Stack', 'Data Science', ...
  skillsRequired:     { type: [String], default: [] }, // replaces/supplements requirements[]
  workMode: {
    type: String,
    enum: ['Remote', 'Hybrid', 'Onsite', ''],
    default: '',
  },
  jobType: {
    type: String,
    default: 'Full-time',
  },
  experienceRequired: { type: String, default: '' },  // '2-4 years'
  deadline:           { type: Date, default: null },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
  },

  // ── Recruiter ownership ──────────────────────────────────────────────────
  postedBy:   { type: String, default: null }, // User.userId of recruiter
  isExternal: { type: Boolean, default: false },

  // ── Phase 2: Responsibilities & recruiter info ───────────────────────────
  responsibilities: { type: [String], default: [] }, // bullet-point list
  recruiterName:    { type: String, default: '' },
  recruiterTitle:   { type: String, default: '' },
  recruiterEmail:   { type: String, default: '' },

  // ── Legacy / compat fields ────────────────────────────────────────────────
  source: {
    type: String,
    enum: ['Naukri', 'LinkedIn', 'Indeed', 'Glassdoor', 'Direct', 'External', 'Recruiter'],
    default: 'Naukri',
  },
  experience:   { type: String, default: '' },  // kept for backwards compat
  requirements: { type: [String], default: [] },// kept for backwards compat
  applyUrl:     { type: String, default: null },
  tags:         { type: [String], default: [] },
  postedAt:     { type: Date, default: null },

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

jobSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Full-text search index
jobSchema.index({ title: 'text', company: 'text', description: 'text', domain: 'text' });

// ── Phase 3: Performance indexes ────────────────────────────────────────────
jobSchema.index({ status: 1, createdAt: -1 });           // job listing default sort
jobSchema.index({ status: 1, domain: 1, createdAt: -1 });// filtered by domain
jobSchema.index({ status: 1, location: 1, createdAt: -1 });// filtered by location
jobSchema.index({ status: 1, company: 1 });               // company page jobs
jobSchema.index({ status: 1, workMode: 1 });              // filter by remote/hybrid/onsite
jobSchema.index({ postedBy: 1, createdAt: -1 });          // recruiter's own jobs
jobSchema.index({ skillsRequired: 1 });                   // skill-based search
jobSchema.index({ deadline: 1, status: 1 });              // expiry checker query

export default mongoose.model('Job', jobSchema);
