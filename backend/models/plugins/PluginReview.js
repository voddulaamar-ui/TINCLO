import mongoose from 'mongoose';
const pluginReviewSchema = new mongoose.Schema({
  pluginId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Plugin', required: true, index: true },
  userId:     { type: String, required: true },
  rating:     { type: Number, min: 1, max: 5, required: true },
  title:      { type: String, default: '' },
  comment:    { type: String, default: '' },
  reply:      { type: String, default: '' },
  repliedAt:  { type: Date, default: null },
}, { timestamps: true });

pluginReviewSchema.index({ pluginId: 1, userId: 1 }, { unique: true });
export default mongoose.model('PluginReview', pluginReviewSchema);
