import mongoose from 'mongoose';

const hackathonSubmissionSchema = new mongoose.Schema({
  hackathonId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
  teamId:       { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonTeam', required: true },
  userId:       { type: String, required: true },
  // Content
  title:        { type: String, default: '' },
  description:  { type: String, default: '' },
  sourceCode:   { type: String, default: '' },
  repoUrl:      { type: String, default: '' },
  demoUrl:      { type: String, default: '' },
  videoUrl:     { type: String, default: '' },
  presentationUrl: { type: String, default: '' },
  documents:    [{ name: String, url: String }],
  // Tech
  techStack:    { type: [String], default: [] },
  language:     { type: String, default: '' },
  // Evaluation
  scores: [{
    criterion: String, score: { type: Number, default: 0 }, maxScore: { type: Number, default: 100 },
    judgeId: String, judgeName: String, comments: String,
  }],
  totalScore:   { type: Number, default: 0 },
  rank:         { type: Number, default: 0 },
  // AI eval
  aiEvaluation: {
    codeQuality: { type: Number, default: 0 },
    innovation: { type: Number, default: 0 },
    completeness: { type: Number, default: 0 },
    summary: { type: String, default: '' },
  },
  // Status
  status:       { type: String, enum: ['draft', 'submitted', 'under_review', 'evaluated', 'winner', 'disqualified'], default: 'draft' },
  submittedAt:  { type: Date, default: null },
  evaluatedAt:  { type: Date, default: null },
}, { timestamps: true });

hackathonSubmissionSchema.index({ hackathonId: 1, totalScore: -1 });
export default mongoose.model('HackathonSubmission', hackathonSubmissionSchema);
