import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  type:         { type: String, enum: ['course', 'challenge', 'contest', 'workshop', 'hackathon', 'skill'], default: 'course' },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingChallenge', default: null },
  issuer:       { type: String, default: 'TINCLO' },
  issueDate:    { type: Date, default: Date.now },
  certificateUrl: { type: String, default: null },
  credentialId: { type: String, unique: true },
  skillsVerified:{ type: [String], default: [] },
  score:        { type: Number, default: 0 },
}, { timestamps: true });

certificateSchema.index({ userId: 1, type: 1 });
export default mongoose.model('Certificate', certificateSchema);
