import mongoose from 'mongoose';

/**
 * Internal notes on candidates — only visible to organization members.
 */
const candidateNoteSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  candidateId:    { type: String, required: true, index: true },   // User.userId of candidate
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  authorId:       { type: String, required: true },                // User.userId of note author
  authorName:     { type: String, default: '' },
  content:        { type: String, required: true },
  isPinned:       { type: Boolean, default: false },
}, { timestamps: true });

candidateNoteSchema.index({ organizationId: 1, candidateId: 1, createdAt: -1 });

export default mongoose.model('CandidateNote', candidateNoteSchema);
