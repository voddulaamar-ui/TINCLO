import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema({
  degree:      { type: String, default: '' },
  institution: { type: String, default: '' },
  year:        { type: String, default: '' },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name:        { type: String, default: '' },
  description: { type: String, default: '' },
  url:         { type: String, default: '' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  userId:   { type: String, required: true, unique: true, index: true },
  name:     { type: String, trim: true, default: '' },
  email:    { type: String, trim: true, lowercase: true, default: '', index: true },
  password: { type: String, default: '' },
  phone:    { type: String, default: '' },
  location: { type: String, default: '' },
  bio:      { type: String, default: '' },
  role:     { type: String, enum: ['user', 'admin', 'recruiter'], default: 'user' },

  // ── Phase 1: Candidate profile fields ────────────────────────────────────
  profilePicture:    { type: String, default: null },   // URL
  resumeUrl:         { type: String, default: null },   // URL
  resumeName:        { type: String, default: null },   // original filename
  resumeUploadedAt:  { type: Date, default: null },     // upload timestamp

  // Phase 4: Resume versioning
  resumes: [{
    url:        { type: String, required: true },
    name:       { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
    isActive:   { type: Boolean, default: false },
    parsedData: { type: mongoose.Schema.Types.Mixed, default: null },
  }],
  skills:            { type: [String], default: [] },   // ['React', 'Node.js', ...]
  domain:            { type: String, default: '' },     // 'Full Stack', 'Data Science', ...
  experienceYears:   { type: Number, default: 0 },      // numeric years
  preferredLocations:{ type: [String], default: [] },   // ['Bengaluru', 'Remote', ...]
  expectedSalary:    { type: String, default: '' },     // '₹10L - ₹15L'
  education:         { type: [educationSchema], default: [] },
  projects:          { type: [projectSchema], default: [] },
  linkedin:          { type: String, default: '' },
  github:            { type: String, default: '' },

  // ── Meta ─────────────────────────────────────────────────────────────────
  isActive:  { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },

  // ── Phase 3: Email verification ──────────────────────────────────────────
  isEmailVerified:       { type: Boolean, default: false },
  emailVerificationToken:{ type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },

  // ── Phase 3: Forgot password ─────────────────────────────────────────────
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },

  // ── Phase 3: Brute force protection ──────────────────────────────────────
  failedLoginAttempts:  { type: Number, default: 0 },
  lockUntil:            { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('User', userSchema);
