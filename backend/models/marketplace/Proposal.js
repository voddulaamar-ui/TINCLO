import mongoose from 'mongoose';
const proposalSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceProject', required: true, index: true },
  freelancerId: { type: String, required: true, index: true },
  coverLetter:  { type: String, default: '' },
  estimatedCost:{ type: Number, default: 0 },
  estimatedDuration: { type: String, default: '' },
  attachments:  [{ url: String, name: String }],
  status:       { type: String, enum: ['pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn'], default: 'pending', index: true },
  clientNote:   { type: String, default: '' },
}, { timestamps: true });

proposalSchema.index({ projectId: 1, freelancerId: 1 }, { unique: true });
export default mongoose.model('Proposal', proposalSchema);
