import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, index: true },
  slug: { type: String, required: true, trim: true, unique: true, lowercase: true, index: true },
  logo: { type: String, default: null },
  coverBanner: { type: String, default: null },
  industry: { type: String, default: '' },
  website: { type: String, default: '' },
  headquarters: { type: String, default: '' },
  companySize: { type: String, default: '' },
  about: { type: String, default: '' },
  benefits: { type: [String], default: [] },
  techStack: { type: [String], default: [] },
  socialLinks: {
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    github: { type: String, default: '' },
  },
  totalEmployees: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  hiringStatus: { type: String, default: 'Hiring' },
}, { timestamps: true });

companySchema.index({ name: 'text', industry: 'text', about: 'text', techStack: 'text' });

export default mongoose.model('Company', companySchema);
