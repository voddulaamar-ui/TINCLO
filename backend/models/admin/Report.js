import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporterId:  { type: String, required: true, index: true },
  type:        { type: String, enum: ['spam', 'harassment', 'fake_job', 'fake_company', 'copyright', 'offensive', 'other'], required: true, index: true },
  targetType:  { type: String, enum: ['job', 'user', 'company', 'post', 'message', 'comment'], required: true },
  targetId:    { type: String, required: true },
  description: { type: String, default: '' },
  evidence:    [{ url: String, name: String }],
  status:      { type: String, enum: ['open', 'investigating', 'resolved', 'dismissed'], default: 'open', index: true },
  assignedTo:  { type: String, default: null },
  resolution:  { type: String, default: '' },
  resolvedAt:  { type: Date, default: null },
}, { timestamps: true });

reportSchema.index({ status: 1, type: 1, createdAt: -1 });
export default mongoose.model('Report', reportSchema);
