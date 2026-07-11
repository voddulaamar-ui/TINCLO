import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  content:    { type: String, default: '' },
  url:        { type: String, default: '' },
  fileType:   { type: String, default: '' },
  wordCount:  { type: Number, default: 0 },
  chunks:     { type: Number, default: 0 },
  status:     { type: String, enum: ['processing', 'indexed', 'failed'], default: 'processing' },
  metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
  addedAt:    { type: Date, default: Date.now },
}, { _id: true });

const knowledgeBaseSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  documents:      { type: [documentSchema], default: [] },
  documentCount:  { type: Number, default: 0 },
  totalChunks:    { type: Number, default: 0 },
  totalWords:     { type: Number, default: 0 },
  lastSyncAt:     { type: Date, default: null },
  status:         { type: String, enum: ['active', 'indexing', 'error'], default: 'active' },
  createdBy:      { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('KnowledgeBase', knowledgeBaseSchema);
