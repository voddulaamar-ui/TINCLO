import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text:       { type: String, required: true },
  type:       { type: String, enum: ['mcq', 'true_false', 'fill_blank', 'code_output', 'coding'], default: 'mcq' },
  options:    { type: [String], default: [] },
  answer:     { type: String, default: '' },
  explanation:{ type: String, default: '' },
  points:     { type: Number, default: 1 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
}, { _id: true });

const quizSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  lessonId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
  title:      { type: String, required: true },
  description:{ type: String, default: '' },
  questions:  { type: [questionSchema], default: [] },
  timeLimit:  { type: Number, default: 0 },  // minutes, 0 = unlimited
  passingScore:{ type: Number, default: 60 },
  maxAttempts:{ type: Number, default: 3 },
  category:   { type: String, default: '' },
  skillTag:   { type: String, default: '' },
  isPublished:{ type: Boolean, default: true },
}, { timestamps: true });

quizSchema.index({ courseId: 1 });
quizSchema.index({ skillTag: 1 });
export default mongoose.model('Quiz', quizSchema);
