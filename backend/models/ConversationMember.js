import mongoose from 'mongoose';

/**
 * Per-user conversation state: unread count, pinned, archived, muted, last read.
 */
const conversationMemberSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  userId:         { type: String, required: true, index: true },

  // User-level state
  isPinned:    { type: Boolean, default: false },
  isArchived:  { type: Boolean, default: false },
  isMuted:     { type: Boolean, default: false },
  unreadCount: { type: Number, default: 0 },
  lastReadAt:  { type: Date, default: null },
  lastSeenMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  // Role in conversation (for group chats)
  role: { type: String, enum: ['member', 'admin', 'owner'], default: 'member' },

  joinedAt:  { type: Date, default: Date.now },
  leftAt:    { type: Date, default: null },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

conversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
conversationMemberSchema.index({ userId: 1, isArchived: 1, isPinned: -1 });
conversationMemberSchema.index({ userId: 1, unreadCount: -1 });

export default mongoose.model('ConversationMember', conversationMemberSchema);
