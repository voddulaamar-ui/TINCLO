import mongoose from 'mongoose';
const careerPlanSchema = new mongoose.Schema({
  userId:        { type: String, required: true, index: true },
  currentRole:   { type: String, default: '' },
  targetRole:    { type: String, default: '' },
  currentSkills: { type: [String], default: [] },
  targetSkills:  { type: [String], default: [] },
  milestones:    [{ title: String, timeline: String, skills: [String], completed: { type: Boolean, default: false } }],
  roadmap:       { type: String, default: '' },
  salaryGrowth:  { type: String, default: '' },
  generatedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

careerPlanSchema.index({ userId: 1, createdAt: -1 });
export default mongoose.model('CareerPlan', careerPlanSchema);
