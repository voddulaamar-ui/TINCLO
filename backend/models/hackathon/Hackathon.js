import mongoose from 'mongoose';

const hackathonSchema = new mongoose.Schema({
  orgId:          { type: String, index: true, default: '' },
  createdBy:      { type: String, required: true },
  // Basic info
  title:          { type: String, required: true },
  description:    { type: String, default: '' },
  theme:          { type: String, default: '' },
  type:           { type: String, enum: ['coding', 'ai', 'ml', 'data_science', 'cybersecurity', 'cloud', 'uiux', 'game_dev', 'web', 'mobile', 'blockchain', 'iot', 'startup', 'innovation', 'case_study', 'product', 'custom'], default: 'coding' },
  category:       { type: String, enum: ['open', 'university', 'company', 'internal', 'hiring'], default: 'open' },
  // Dates
  registrationStart: { type: Date },
  registrationEnd:   { type: Date },
  startDate:      { type: Date },
  endDate:        { type: Date },
  // Config
  maxParticipants:{ type: Number, default: 1000 },
  teamSize:       { min: { type: Number, default: 1 }, max: { type: Number, default: 5 } },
  eligibility:    { type: String, default: '' },
  rules:          { type: String, default: '' },
  // Problems
  problems: [{
    title: String, description: String, difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'medium' },
    points: { type: Number, default: 100 }, dataset: String, starterCode: String,
  }],
  // Evaluation
  evaluationMethod: { type: String, enum: ['auto', 'manual', 'ai_assisted', 'peer', 'panel', 'hybrid'], default: 'hybrid' },
  scoringCriteria: [{
    name: String, weight: { type: Number, default: 20 }, maxScore: { type: Number, default: 100 },
  }],
  // Prizes
  prizes: [{
    rank: { type: Number }, title: String, description: String, value: String, type: { type: String, enum: ['cash', 'internship', 'job', 'certificate', 'scholarship', 'voucher', 'badge', 'swag'], default: 'cash' },
  }],
  // People
  judges:   [{ userId: String, name: String, role: String }],
  mentors:  [{ userId: String, name: String, expertise: String }],
  sponsors: [{ name: String, logo: String, tier: String }],
  // Stats
  registrationCount: { type: Number, default: 0 },
  teamCount:        { type: Number, default: 0 },
  submissionCount:  { type: Number, default: 0 },
  // Status
  status:     { type: String, enum: ['draft', 'upcoming', 'registration', 'live', 'judging', 'completed', 'cancelled'], default: 'draft' },
  visibility: { type: String, enum: ['public', 'private', 'invite_only'], default: 'public' },
  isHiringEvent: { type: Boolean, default: false },
  // Media
  banner:     { type: String, default: '' },
  tags:       { type: [String], default: [] },
}, { timestamps: true });

hackathonSchema.index({ status: 1, startDate: -1 });
hackathonSchema.index({ type: 1, category: 1 });
export default mongoose.model('Hackathon', hackathonSchema);
