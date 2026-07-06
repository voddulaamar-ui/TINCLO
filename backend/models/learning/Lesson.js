import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  moduleIndex:{ type: Number, default: 0 },
  orderIndex: { type: Number, default: 0 },
  title:      { type: String, required: true },
  type:       { type: String, enum: ['video', 'document', 'quiz', 'assignment', 'coding'], default: 'video' },
  content:    { type: String, default: '' },
  videoUrl:   { type: String, default: '' },
  duration:   { type: Number, default: 0 },  // minutes
  attachments:[{ url: String, name: String, type: String }],
  isPreview:  { type: Boolean, default: false },
}, { timestamps: true });

lessonSchema.index({ courseId: 1, moduleIndex: 1, orderIndex: 1 });
export default mongoose.model('Lesson', lessonSchema);
