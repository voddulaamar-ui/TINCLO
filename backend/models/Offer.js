import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  matchId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Match', index: true },
  candidateId:  { type: String, required: true, index: true },
  recruiterId:  { type: String, required: true, index: true },

  // Offer details
  jobTitle:      { type: String, default: '' },
  company:       { type: String, default: '' },
  salary:        { type: String, default: '' },
  joiningDate:   { type: Date, default: null },
  offerLetterUrl:{ type: String, default: null },  // uploaded PDF
  remarks:       { type: String, default: '' },

  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'],
    default: 'pending',
    index: true,
  },

  // Response
  candidateResponse:   { type: String, default: '' },
  respondedAt:         { type: Date, default: null },
  expiresAt:           { type: Date, default: null },  // offer deadline
}, { timestamps: true });

offerSchema.index({ candidateId: 1, status: 1 });
offerSchema.index({ recruiterId: 1, createdAt: -1 });

export default mongoose.model('Offer', offerSchema);
