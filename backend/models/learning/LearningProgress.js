import mongoose from 'mongoose';

const learningProgressSchema = new mongoose.Schema({
  userId:     { type: String, required: true, index: true },
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  lessonId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
  challengeId:{ type: mongoose.Schema.Types.ObjectId, ref: 'CodingChallenge', default: null },
  type:       { type: String, enum: ['course', 'lesson', 'quiz', 'challenge', 'project'], default: 'lesson' },
  status:     { type: String, enum: ['enrolled', 'in_progress', 'completed'], default: 'enrolled' },
  progress:   { type: Number, default: 0, min: 0, max: 100 },
  score:      { type: Number, default: 0 },
  completedAt:{ type: Date, default: null },
  xpEarned:   { type: Number, default: 0 },
  timeSpent:  { type: Number, default: 0 },  // minutes
}, { timestamps: true });

learningProgressSchema.index({ userId: 1, courseId: 1 });
learningProgressSchema.index({ userId: 1, type: 1, status: 1 });
export default mongoose.model('LearningProgress', learningProgressSchema);
