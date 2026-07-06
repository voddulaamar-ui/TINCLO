import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  type:        { type: String, enum: ['webinar', 'hackathon', 'contest', 'hiring_drive', 'meetup', 'bootcamp', 'workshop'], default: 'webinar', index: true },
  description: { type: String, default: '' },
  organizer:   { type: String, default: '' },
  organizerId: { type: String, default: null },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, default: null },
  location:    { type: String, default: 'Online' },
  meetingLink: { type: String, default: '' },
  thumbnail:   { type: String, default: null },
  maxAttendees:{ type: Number, default: 0 },
  registeredCount:{ type: Number, default: 0 },
  tags:        { type: [String], default: [] },
  status:      { type: String, enum: ['upcoming', 'live', 'completed', 'cancelled'], default: 'upcoming', index: true },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

eventSchema.index({ startDate: -1 });
export default mongoose.model('Event', eventSchema);
