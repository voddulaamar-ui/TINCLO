import mongoose from 'mongoose';

const userSkillEntrySchema = new mongoose.Schema({
  skillKey:     { type: String, required: true },
  name:         { type: String, default: '' },
  level:        { type: Number, default: 0, min: 0, max: 100 },
  verified:     { type: Boolean, default: false },
  verifiedBy:   { type: String, default: '' },
  verifiedAt:   { type: Date, default: null },
  learnedAt:    { type: Date, default: null },
  lastUsedAt:   { type: Date, default: null },
  // Progress history
  progressHistory: [{ date: Date, level: Number }],
  // Sources
  source:       { type: String, enum: ['self', 'assessment', 'project', 'certification', 'employment', 'mentor', 'ai'], default: 'self' },
  endorsements: { type: Number, default: 0 },
  heatScore:    { type: Number, default: 0 },  // composite activity score
}, { _id: true });

const userSkillGraphSchema = new mongoose.Schema({
  userId:         { type: String, required: true, unique: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  skills:         { type: [userSkillEntrySchema], default: [] },
  // Computed
  totalSkills:    { type: Number, default: 0 },
  verifiedSkills: { type: Number, default: 0 },
  avgLevel:       { type: Number, default: 0 },
  topCategory:    { type: String, default: '' },
  overallScore:   { type: Number, default: 0 },
  // Career path
  currentPath:    { type: String, default: '' },
  targetRole:     { type: String, default: '' },
  pathProgress:   { type: Number, default: 0 },
}, { timestamps: true });

userSkillGraphSchema.index({ 'skills.skillKey': 1 });
export default mongoose.model('UserSkillGraph', userSkillGraphSchema);
