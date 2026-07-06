import mongoose from 'mongoose';

const bookmarkCollectionSchema = new mongoose.Schema({
  userId:      { type: String, required: true, index: true },
  name:        { type: String, required: true, trim: true },   // "Dream Companies", "Remote Jobs"
  description: { type: String, default: '' },
  color:       { type: String, default: '#667eea' },           // UI accent color
  icon:        { type: String, default: '📁' },
  jobIds:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  isDefault:   { type: Boolean, default: false },              // "All Saved" default collection
}, { timestamps: true });

bookmarkCollectionSchema.index({ userId: 1, name: 1 }, { unique: true });
bookmarkCollectionSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model('BookmarkCollection', bookmarkCollectionSchema);
