import mongoose from 'mongoose';
const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true }, description: { type: String, default: '' },
  amount: { type: Number, default: 0 }, status: { type: String, enum: ['pending', 'in_progress', 'completed', 'paid'], default: 'pending' },
  dueDate: { type: Date, default: null }, completedAt: { type: Date, default: null },
}, { _id: true });

const projectSchema = new mongoose.Schema({
  clientId:    { type: String, required: true, index: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: String, default: '', index: true },
  skills:      { type: [String], default: [] },
  budgetType:  { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
  budgetMin:   { type: Number, default: 0 },
  budgetMax:   { type: Number, default: 0 },
  currency:    { type: String, default: 'INR' },
  duration:    { type: String, default: '' },
  experience:  { type: String, default: '' },
  attachments: [{ url: String, name: String }],
  milestones:  { type: [milestoneSchema], default: [] },
  status:      { type: String, enum: ['open', 'in_progress', 'completed', 'cancelled', 'disputed'], default: 'open', index: true },
  awardedTo:   { type: String, default: null },
  proposalCount:{ type: Number, default: 0 },
  visibility:  { type: String, enum: ['public', 'private', 'invite'], default: 'public' },
  location:    { type: String, default: 'Remote' },
  projectType: { type: String, enum: ['freelance', 'gig', 'internship', 'consulting', 'training'], default: 'freelance', index: true },
}, { timestamps: true });

projectSchema.index({ title: 'text', description: 'text', skills: 'text' });
projectSchema.index({ status: 1, category: 1, createdAt: -1 });
export default mongoose.model('MarketplaceProject', projectSchema);
