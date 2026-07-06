import mongoose from 'mongoose';

const communityPostSchema = new mongoose.Schema({
  authorId:   { type: String, required: true, index: true },
  authorName: { type: String, default: '' },
  type:       { type: String, enum: ['discussion', 'question', 'blog', 'interview_exp', 'project', 'announcement'], default: 'discussion', index: true },
  category:   { type: String, default: 'general', index: true },
  title:      { type: String, required: true },
  content:    { type: String, required: true },
  tags:       { type: [String], default: [] },
  groupId:    { type: mongoose.Schema.Types.ObjectId, default: null },
  // Engagement
  upvotes:    { type: Number, default: 0 },
  downvotes:  { type: Number, default: 0 },
  viewCount:  { type: Number, default: 0 },
  commentCount:{ type: Number, default: 0 },
  bookmarkCount:{ type: Number, default: 0 },
  votedBy:    [{ userId: String, vote: { type: Number, enum: [-1, 1] } }],
  // Q&A
  isAnswered: { type: Boolean, default: false },
  acceptedAnswer:{ type: mongoose.Schema.Types.ObjectId, default: null },
  // Status
  isPinned:   { type: Boolean, default: false },
  isPublished:{ type: Boolean, default: true },
}, { timestamps: true });

communityPostSchema.index({ title: 'text', content: 'text', tags: 'text' });
communityPostSchema.index({ type: 1, category: 1, createdAt: -1 });
export default mongoose.model('CommunityPost', communityPostSchema);
