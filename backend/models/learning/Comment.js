import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  postId:     { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  authorId:   { type: String, required: true },
  authorName: { type: String, default: '' },
  content:    { type: String, required: true },
  parentId:   { type: mongoose.Schema.Types.ObjectId, default: null },  // for threading
  upvotes:    { type: Number, default: 0 },
  isAccepted: { type: Boolean, default: false },
}, { timestamps: true });

commentSchema.index({ postId: 1, createdAt: -1 });
export default mongoose.model('Comment', commentSchema);
