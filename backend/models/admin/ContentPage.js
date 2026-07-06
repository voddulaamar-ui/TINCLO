import mongoose from 'mongoose';

const contentPageSchema = new mongoose.Schema({
  slug:       { type: String, required: true, unique: true, index: true },
  title:      { type: String, required: true },
  content:    { type: String, default: '' },  // markdown or HTML
  category:   { type: String, enum: ['page', 'blog', 'guide', 'faq', 'announcement', 'news'], default: 'page' },
  status:     { type: String, enum: ['draft', 'published', 'archived', 'scheduled'], default: 'draft', index: true },
  author:     { type: String, default: '' },
  tags:       { type: [String], default: [] },
  thumbnail:  { type: String, default: null },
  publishAt:  { type: Date, default: null },
  viewCount:  { type: Number, default: 0 },
}, { timestamps: true });

contentPageSchema.index({ title: 'text', content: 'text', tags: 'text' });
export default mongoose.model('ContentPage', contentPageSchema);
