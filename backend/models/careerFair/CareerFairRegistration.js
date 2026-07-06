import mongoose from 'mongoose';

const careerFairRegistrationSchema = new mongoose.Schema({
  careerFairId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerFair', required: true, index: true },
  userId:       { type: String, required: true },
  userName:     { type: String, default: '' },
  email:        { type: String, default: '' },
  // Profile snapshot
  skills:       { type: [String], default: [] },
  experience:   { type: Number, default: 0 },
  preferredRoles: { type: [String], default: [] },
  resume:       { type: String, default: '' },
  // Engagement
  boothsVisited:  [{ boothId: mongoose.Schema.Types.ObjectId, visitedAt: Date }],
  sessionsAttended: [{ sessionIndex: Number, attendedAt: Date }],
  applicationsSubmitted: [{ jobId: String, boothId: mongoose.Schema.Types.ObjectId }],
  interviewsScheduled: [{ boothId: mongoose.Schema.Types.ObjectId, time: Date, status: String }],
  // Networking
  connectionsRequested: [{ userId: String, name: String }],
  messagesCount:  { type: Number, default: 0 },
  // Status
  status:       { type: String, enum: ['registered', 'attended', 'no_show', 'cancelled'], default: 'registered' },
  attendedAt:   { type: Date, default: null },
  // Certificate
  certificateIssued: { type: Boolean, default: false },
  // Feedback
  rating:       { type: Number, default: 0 },
  feedback:     { type: String, default: '' },
}, { timestamps: true });

careerFairRegistrationSchema.index({ careerFairId: 1, userId: 1 }, { unique: true });
export default mongoose.model('CareerFairRegistration', careerFairRegistrationSchema);
