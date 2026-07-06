import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  // Type of conversation
  type: {
    type: String,
    enum: ['direct', 'group', 'interview', 'job_discussion', 'internal', 'announcement'],
    default: 'direct',
    index: true,
  },

  // Participants
  participants: [{ type: String, index: true }],   // User.userId array
  participantCount: { type: Number, default: 2 },

  // Context references (optional)
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  candidateId:    { type: String, default: null },
  interviewId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', default: null },

  // Group chat metadata
  name:        { type: String, default: '' },         // group name
  description: { type: String, default: '' },
  avatar:      { type: String, default: null },
  createdBy:   { type: String, default: '' },

  // Last message preview
  lastMessage:     { type: String, default: '' },
  lastMessageAt:   { type: Date, default: null },
  lastMessageBy:   { type: String, default: '' },

  // Status
  status: { type: String, enum: ['active', 'closed', 'archived'], default: 'active', index: true },

  // Labels
  labels: { type: [String], default: [] },           // ['interview', 'urgent', 'offer']

  // Per-user metadata is stored in ConversationMember (separate collection for scale)
}, { timestamps: true });

conversationSchema.index({ participants: 1, type: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ organizationId: 1, type: 1 });

export default mongoose.model('Conversation', conversationSchema);
