import mongoose from 'mongoose';
const marketplaceReviewSchema = new mongoose.Schema({
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceProject', index: true },
  reviewerId:  { type: String, required: true, index: true },
  revieweeId:  { type: String, required: true, index: true },
  role:        { type: String, enum: ['client', 'freelancer'], required: true },
  ratings: {
    communication: { type: Number, min: 1, max: 5, default: 5 },
    quality:       { type: Number, min: 1, max: 5, default: 5 },
    professionalism:{ type: Number, min: 1, max: 5, default: 5 },
    delivery:      { type: Number, min: 1, max: 5, default: 5 },
    overall:       { type: Number, min: 1, max: 5, default: 5 },
  },
  comment:     { type: String, default: '' },
}, { timestamps: true });

marketplaceReviewSchema.index({ revieweeId: 1, createdAt: -1 });
export default mongoose.model('MarketplaceReview', marketplaceReviewSchema);
