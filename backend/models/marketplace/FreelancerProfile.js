import mongoose from 'mongoose';
const freelancerProfileSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true, index: true },
  title:        { type: String, default: '' },
  bio:          { type: String, default: '' },
  skills:       { type: [String], default: [] },
  hourlyRate:   { type: Number, default: 0 },
  currency:     { type: String, default: 'INR' },
  availability: { type: String, enum: ['available', 'busy', 'not_available'], default: 'available', index: true },
  experience:   { type: Number, default: 0 },
  languages:    { type: [String], default: ['English'] },
  portfolio:    [{ title: String, url: String, image: String }],
  responseTime: { type: String, default: '' },
  successRate:  { type: Number, default: 100 },
  projectsCompleted: { type: Number, default: 0 },
  totalEarnings:{ type: Number, default: 0 },
  rating:       { type: Number, default: 0 },
  ratingCount:  { type: Number, default: 0 },
  roles:        { type: [String], default: ['freelancer'] },  // ['freelancer','mentor','consultant','trainer']
  isVerified:   { type: Boolean, default: false },
  categories:   { type: [String], default: [] },
}, { timestamps: true });

freelancerProfileSchema.index({ skills: 1, availability: 1 });
freelancerProfileSchema.index({ title: 'text', bio: 'text', skills: 'text' });
export default mongoose.model('FreelancerProfile', freelancerProfileSchema);
