import mongoose from 'mongoose';
const candidateRankingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  generatedBy:    { type: String, required: true },
  rankings: [{
    candidateId: String,
    name:        String,
    rank:        Number,
    score:       Number,
    strengths:   [String],
    concerns:    [String],
    reasoning:   String,
  }],
  criteria:       { type: mongoose.Schema.Types.Mixed, default: {} },
  generatedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

candidateRankingSchema.index({ jobId: 1, generatedAt: -1 });
export default mongoose.model('CandidateRanking', candidateRankingSchema);
