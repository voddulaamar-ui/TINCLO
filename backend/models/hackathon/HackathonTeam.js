import mongoose from 'mongoose';

const hackathonTeamSchema = new mongoose.Schema({
  hackathonId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
  name:         { type: String, required: true },
  leaderId:     { type: String, required: true },
  leaderName:   { type: String, default: '' },
  // Members
  members: [{
    userId: String, name: String, email: String, role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  // Status
  status:       { type: String, enum: ['forming', 'registered', 'active', 'submitted', 'disqualified'], default: 'registered' },
  inviteCode:   { type: String, default: '' },
  // Scores
  totalScore:   { type: Number, default: 0 },
  rank:         { type: Number, default: 0 },
  // Submission ref
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonSubmission', default: null },
}, { timestamps: true });

hackathonTeamSchema.index({ hackathonId: 1, leaderId: 1 });
export default mongoose.model('HackathonTeam', hackathonTeamSchema);
