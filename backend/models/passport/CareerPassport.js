import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true }, level: { type: Number, default: 0, min: 0, max: 100 },
  verified: { type: Boolean, default: false }, verifiedBy: { type: String, default: '' },
  lastUsed: { type: Date, default: null }, category: { type: String, default: 'technical' },
}, { _id: true });

const timelineEventSchema = new mongoose.Schema({
  type: { type: String, enum: ['job', 'project', 'course', 'certificate', 'award', 'hackathon', 'event', 'promotion', 'achievement'], required: true },
  title: { type: String, required: true }, description: { type: String, default: '' },
  organization: { type: String, default: '' }, date: { type: Date, default: Date.now },
  endDate: { type: Date, default: null }, url: { type: String, default: '' },
  icon: { type: String, default: '' }, verified: { type: Boolean, default: false },
}, { _id: true });

const endorsementSchema = new mongoose.Schema({
  fromUserId: { type: String, required: true }, fromName: { type: String, default: '' },
  fromRole: { type: String, default: '' }, skill: { type: String, default: '' },
  message: { type: String, default: '' }, verified: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
}, { _id: true });

const careerPassportSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true, index: true },
  passportId:   { type: String, required: true, unique: true, index: true },
  username:     { type: String, unique: true, sparse: true, index: true },
  // Identity
  fullName:     { type: String, default: '' },
  headline:     { type: String, default: '' },
  title:        { type: String, default: '' },
  photo:        { type: String, default: null },
  coverImage:   { type: String, default: null },
  location:     { type: String, default: '' },
  nationality:  { type: String, default: '' },
  languages:    { type: [String], default: [] },
  // Links
  website:      { type: String, default: '' },
  linkedin:     { type: String, default: '' },
  github:       { type: String, default: '' },
  twitter:      { type: String, default: '' },
  leetcode:     { type: String, default: '' },
  hackerrank:   { type: String, default: '' },
  stackoverflow:{ type: String, default: '' },
  // Sections
  skills:       { type: [skillSchema], default: [] },
  timeline:     { type: [timelineEventSchema], default: [] },
  endorsements: { type: [endorsementSchema], default: [] },
  references:   [{ name: String, role: String, company: String, email: String, phone: String, relationship: String, visible: { type: Boolean, default: false } }],
  // Career DNA
  careerDna: {
    backend: { type: Number, default: 0 }, frontend: { type: Number, default: 0 },
    leadership: { type: Number, default: 0 }, communication: { type: Number, default: 0 },
    problemSolving: { type: Number, default: 0 }, learningSpeed: { type: Number, default: 0 },
  },
  // Scores
  passportScore:    { type: Number, default: 0 },
  profileCompletion:{ type: Number, default: 0 },
  verificationLevel:{ type: Number, default: 0 },
  // Privacy
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'recruiters', 'connections', 'private'], default: 'public' },
    showSalary:    { type: Boolean, default: false },
    showPhone:     { type: Boolean, default: false },
    showEmail:     { type: Boolean, default: true },
    showAssessments:{ type: Boolean, default: true },
    showReferences:{ type: Boolean, default: false },
  },
  // Verification
  isVerified:     { type: Boolean, default: false },
  verifiedEmail:  { type: Boolean, default: false },
  verifiedPhone:  { type: Boolean, default: false },
  verifiedIdentity:{ type: Boolean, default: false },
  // QR
  qrCodeUrl:      { type: String, default: null },
  // Sharing
  shareLinks:     [{ token: String, expiresAt: Date, createdAt: { type: Date, default: Date.now }, views: { type: Number, default: 0 } }],
  // Analytics
  totalViews:     { type: Number, default: 0 },
  recruiterViews: { type: Number, default: 0 },
  searchAppearances: { type: Number, default: 0 },
}, { timestamps: true });

careerPassportSchema.index({ fullName: 'text', headline: 'text', title: 'text' });
export default mongoose.model('CareerPassport', careerPassportSchema);
