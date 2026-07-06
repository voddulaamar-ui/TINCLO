import mongoose from 'mongoose';

const mentorSchema = new mongoose.Schema({
  userId:     { type: String, required: true, unique: true, index: true },
  name:       { type: String, required: true },
  expertise:  { type: [String], default: [] },
  experience: { type: Number, default: 0 },
  bio:        { type: String, default: '' },
  languages:  { type: [String], default: ['English'] },
  availability:{ type: String, default: '' },
  sessionTypes:{ type: [String], default: ['video', 'chat'] },
  rating:     { type: Number, default: 0 },
  ratingCount:{ type: Number, default: 0 },
  totalSessions:{ type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  isFree:     { type: Boolean, default: true },
  isActive:   { type: Boolean, default: true },
  profilePicture: { type: String, default: null },
  linkedin:   { type: String, default: '' },
}, { timestamps: true });

mentorSchema.index({ expertise: 1, isActive: 1 });
export default mongoose.model('Mentor', mentorSchema);
