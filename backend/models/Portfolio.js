import mongoose from 'mongoose';

const projectItemSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  url:         { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  techStack:   { type: [String], default: [] },
}, { _id: true });

const certificationSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  issuer:      { type: String, default: '' },
  issueDate:   { type: Date, default: null },
  url:         { type: String, default: '' },
}, { _id: true });

const portfolioSchema = new mongoose.Schema({
  userId:     { type: String, required: true, unique: true, index: true },

  // Sections
  headline:     { type: String, default: '' },   // "Full Stack Developer | React & Node.js"
  bio:          { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },   // external portfolio site
  githubUrl:    { type: String, default: '' },
  linkedinUrl:  { type: String, default: '' },
  blogUrl:      { type: String, default: '' },
  videoUrl:     { type: String, default: '' },   // intro video

  // Showcase items
  projects:       { type: [projectItemSchema], default: [] },
  certifications: { type: [certificationSchema], default: [] },
  achievements:   { type: [String], default: [] },  // bullet points
  skills:         { type: [String], default: [] },   // highlighted skills

  // Visibility
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Portfolio', portfolioSchema);
