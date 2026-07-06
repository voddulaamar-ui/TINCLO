import mongoose from 'mongoose';

/**
 * Custom tags applied to candidates within an organization.
 */
const candidateTagSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  candidateId:    { type: String, required: true, index: true },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  tags:           { type: [String], default: [] },        // ['React', 'Senior', 'Immediate Joiner']
  addedBy:        { type: String, default: '' },
}, { timestamps: true });

candidateTagSchema.index({ organizationId: 1, candidateId: 1, jobId: 1 }, { unique: true });
candidateTagSchema.index({ organizationId: 1, tags: 1 });

export default mongoose.model('CandidateTag', candidateTagSchema);
