import mongoose from 'mongoose';
const promptTemplateSchema = new mongoose.Schema({
  key:            { type: String, required: true, unique: true, index: true },
  name:           { type: String, required: true },
  category:       { type: String, enum: ['candidate', 'recruiter', 'hr', 'admin', 'system'], default: 'system' },
  template:       { type: String, required: true },
  variables:      { type: [String], default: [] },
  description:    { type: String, default: '' },
  isActive:       { type: Boolean, default: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
}, { timestamps: true });

export default mongoose.model('PromptTemplate', promptTemplateSchema);
