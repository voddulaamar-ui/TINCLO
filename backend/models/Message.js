import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  url:      { type: String, required: true },
  name:     { type: String, default: '' },
  type:     { type: String, default: '' },           // 'image/png', 'application/pdf', etc.
  size:     { type: Number, default: 0 },
}, { _id: true });

const reactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  emoji:  { type: String, required: true },          // '👍', '❤️', '🎉', etc.
  at:     { type: Date, default: Date.now },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId:       { type: String, required: true, index: true },
  senderName:     { type: String, default: '' },

  // Content
  type: {
    type: String,
    enum: ['text', 'image', 'pdf', 'resume', 'doc', 'audio', 'video', 'system', 'announcement'],
    default: 'text',
  },
  content:     { type: String, default: '' },
  attachments: { type: [attachmentSchema], default: [] },

  // Threading
  replyTo:       { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  // Mentions
  mentions: { type: [String], default: [] },         // User.userId array

  // Reactions
  reactions: { type: [reactionSchema], default: [] },

  // Status tracking
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  deliveredAt: { type: Date, default: null },
  readAt:      { type: Date, default: null },
  readBy:      [{ userId: String, at: Date }],       // for group chats

  // Editing
  isEdited:   { type: Boolean, default: false },
  editedAt:   { type: Date, default: null },
  editHistory:[{ content: String, editedAt: Date }],

  // Deletion
  isDeleted:       { type: Boolean, default: false },
  deletedAt:       { type: Date, default: null },
  deletedForAll:   { type: Boolean, default: false },
  deletedForUsers: { type: [String], default: [] },  // userId list (soft delete per user)
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, senderId: 1 });
messageSchema.index({ content: 'text' });            // text search
messageSchema.index({ mentions: 1 });

export default mongoose.model('Message', messageSchema);
