import mongoose from 'mongoose';

const companyFollowSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
}, { timestamps: true });

companyFollowSchema.index({ userId: 1, companyId: 1 }, { unique: true });

export default mongoose.model('CompanyFollow', companyFollowSchema);
