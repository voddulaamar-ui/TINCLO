import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  query: { type: String, default: '' },
  location: { type: String, default: '' },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

searchHistorySchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model('SearchHistory', searchHistorySchema);
