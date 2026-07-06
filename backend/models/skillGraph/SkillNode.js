import mongoose from 'mongoose';

const skillNodeSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, lowercase: true, index: true },
  name:         { type: String, required: true },
  category:     { type: String, enum: ['programming', 'framework', 'database', 'cloud', 'devops', 'ai', 'security', 'data', 'mobile', 'design', 'soft_skill', 'business', 'other'], default: 'programming', index: true },
  subcategory:  { type: String, default: '' },
  difficulty:   { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' },
  description:  { type: String, default: '' },
  icon:         { type: String, default: '' },
  // Relationships
  prerequisites:{ type: [String], default: [] },   // skill keys required before this
  relatedSkills:{ type: [String], default: [] },   // sibling/related skills
  unlocksSkills:{ type: [String], default: [] },   // what this skill enables
  // Market data
  demandScore:  { type: Number, default: 50, min: 0, max: 100 },
  salaryImpact: { type: Number, default: 0 },      // estimated salary boost in %
  trendDirection:{ type: String, enum: ['rising', 'stable', 'declining'], default: 'stable' },
  jobCount:     { type: Number, default: 0 },
  // Learning
  avgLearningHours: { type: Number, default: 40 },
  recommendedCourses: { type: [String], default: [] },
  recommendedProjects: { type: [String], default: [] },
  // Meta
  isEmerging:   { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

skillNodeSchema.index({ name: 'text', category: 'text' });
skillNodeSchema.index({ demandScore: -1 });
export default mongoose.model('SkillNode', skillNodeSchema);
