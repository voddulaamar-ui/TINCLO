import mongoose from 'mongoose';

const aiMessageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  at:      { type: Date, default: Date.now },
}, { _id: true });

const aiConversationSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  type:      { type: String, enum: ['candidate', 'recruiter', 'admin', 'career', 'interview_prep'], default: 'candidate', index: true },
  title:     { type: String, default: 'New Conversation' },
  messages:  { type: [aiMessageSchema], default: [] },
  context:   { type: mongoose.Schema.Types.Mixed, default: {} },   // job/candidate context
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

aiConversationSchema.index({ userId: 1, isActive: 1, updatedAt: -1 });

export default mongoose.model('AiConversation', aiConversationSchema);
