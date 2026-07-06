import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  userId:         { type: String, required: true, index: true },
  subject:        { type: String, required: true },
  description:    { type: String, default: '' },
  category:       { type: String, enum: ['billing', 'technical', 'feature', 'account', 'other'], default: 'other' },
  priority:       { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status:         { type: String, enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'], default: 'open', index: true },
  assignedTo:     { type: String, default: null },
  attachments:    [{ url: String, name: String }],
  messages:       [{ senderId: String, content: String, at: { type: Date, default: Date.now } }],
  resolvedAt:     { type: Date, default: null },
  rating:         { type: Number, min: 1, max: 5, default: null },
}, { timestamps: true });

supportTicketSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model('SupportTicket', supportTicketSchema);
