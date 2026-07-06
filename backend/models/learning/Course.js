import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title:          { type: String, required: true, trim: true },
  slug:           { type: String, unique: true, index: true },
  description:    { type: String, default: '' },
  instructor:     { type: String, default: '' },
  instructorId:   { type: String, default: null, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  category:       { type: String, default: '', index: true },
  difficulty:     { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'beginner' },
  duration:       { type: String, default: '' },
  thumbnail:      { type: String, default: null },
  learningOutcomes: { type: [String], default: [] },
  prerequisites:  { type: [String], default: [] },
  skillsCovered:  { type: [String], default: [] },
  tags:           { type: [String], default: [] },
  lessonCount:    { type: Number, default: 0 },
  enrolledCount:  { type: Number, default: 0 },
  rating:         { type: Number, default: 0 },
  ratingCount:    { type: Number, default: 0 },
  isPublished:    { type: Boolean, default: false, index: true },
  isFree:         { type: Boolean, default: true },
  price:          { type: Number, default: 0 },
}, { timestamps: true });

courseSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text' });
export default mongoose.model('Course', courseSchema);
