import mongoose from 'mongoose';

const careerFairSchema = new mongoose.Schema({
  orgId:          { type: String, index: true, default: '' },
  createdBy:      { type: String, required: true },
  // Basic
  title:          { type: String, required: true },
  description:    { type: String, default: '' },
  type:           { type: String, enum: ['university', 'corporate', 'startup', 'government', 'walk_in', 'industry', 'diversity', 'women', 'remote', 'international', 'internship', 'freelancer', 'veteran', 'campus', 'custom'], default: 'corporate' },
  banner:         { type: String, default: '' },
  theme:          { type: String, default: '' },
  // Dates
  registrationStart: { type: Date },
  registrationEnd:   { type: Date },
  startDate:      { type: Date },
  endDate:        { type: Date },
  timezone:       { type: String, default: 'Asia/Kolkata' },
  // Config
  maxAttendees:   { type: Number, default: 10000 },
  visibility:     { type: String, enum: ['public', 'private', 'invite_only'], default: 'public' },
  // Companies
  companies: [{
    companyId: String, name: String, logo: String, boothId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyBooth' },
  }],
  // Schedule
  sessions: [{
    title: String, speaker: String, type: { type: String, enum: ['webinar', 'workshop', 'panel', 'presentation', 'qa', 'networking'] },
    startTime: Date, endTime: Date, description: String, link: String,
  }],
  // Sponsors
  sponsors: [{ name: String, logo: String, tier: { type: String, enum: ['platinum', 'gold', 'silver', 'bronze'] } }],
  // Stats
  registrationCount: { type: Number, default: 0 },
  attendeeCount:     { type: Number, default: 0 },
  applicationCount:  { type: Number, default: 0 },
  interviewCount:    { type: Number, default: 0 },
  offerCount:        { type: Number, default: 0 },
  // Status
  status:         { type: String, enum: ['draft', 'upcoming', 'registration', 'live', 'completed', 'cancelled'], default: 'draft' },
  tags:           { type: [String], default: [] },
}, { timestamps: true });

careerFairSchema.index({ status: 1, startDate: -1 });
export default mongoose.model('CareerFair', careerFairSchema);
