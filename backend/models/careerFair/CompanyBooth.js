import mongoose from 'mongoose';

const companyBoothSchema = new mongoose.Schema({
  careerFairId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerFair', required: true, index: true },
  companyId:    { type: String, default: '' },
  companyName:  { type: String, required: true },
  logo:         { type: String, default: '' },
  // Booth content
  description:  { type: String, default: '' },
  video:        { type: String, default: '' },
  culture:      { type: String, default: '' },
  benefits:     { type: [String], default: [] },
  documents:    [{ name: String, url: String }],
  faqs:         [{ question: String, answer: String }],
  // Jobs
  openJobs: [{
    jobId: String, title: String, location: String, type: String, salary: String,
  }],
  // Recruiters
  recruiters: [{
    userId: String, name: String, title: String, isOnline: { type: Boolean, default: false },
  }],
  // Features
  chatEnabled:    { type: Boolean, default: true },
  interviewSlots: [{ time: Date, duration: { type: Number, default: 30 }, booked: { type: Boolean, default: false }, candidateId: String }],
  assessmentLink: { type: String, default: '' },
  // Stats
  visitors:       { type: Number, default: 0 },
  applications:   { type: Number, default: 0 },
  chats:          { type: Number, default: 0 },
  resumeDrops:    { type: Number, default: 0 },
  // Status
  status:         { type: String, enum: ['setup', 'active', 'closed'], default: 'setup' },
}, { timestamps: true });

companyBoothSchema.index({ careerFairId: 1, companyName: 1 });
export default mongoose.model('CompanyBooth', companyBoothSchema);
