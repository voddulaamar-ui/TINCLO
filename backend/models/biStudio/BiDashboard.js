import mongoose from 'mongoose';

const widgetSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  type:     { type: String, enum: ['chart', 'table', 'kpi', 'map', 'gauge', 'leaderboard', 'calendar', 'timeline', 'text', 'image', 'filter', 'sparkline'], required: true },
  title:    { type: String, default: '' },
  chartType:{ type: String, default: '' },  // 'bar', 'line', 'pie', 'donut', 'area', etc.
  dataSource:{ type: String, default: '' },
  query:    { type: mongoose.Schema.Types.Mixed, default: {} },
  config:   { type: mongoose.Schema.Types.Mixed, default: {} },
  position: { x: Number, y: Number, w: Number, h: Number },
  filters:  { type: mongoose.Schema.Types.Mixed, default: {} },
  drillDown:{ type: String, default: '' },
}, { _id: false });

const biDashboardSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  userId:         { type: String, required: true, index: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  widgets:        { type: [widgetSchema], default: [] },
  layout:         { type: String, enum: ['grid', 'free', 'responsive'], default: 'grid' },
  globalFilters:  { type: mongoose.Schema.Types.Mixed, default: {} },
  refreshInterval:{ type: Number, default: 0 },  // seconds, 0 = manual
  isTemplate:     { type: Boolean, default: false },
  isPublic:       { type: Boolean, default: false },
  sharedWith:     { type: [String], default: [] },
  permissions:    { type: String, enum: ['private', 'org', 'public'], default: 'private' },
  version:        { type: Number, default: 1 },
  status:         { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  isFavorite:     { type: Boolean, default: false },
  tags:           { type: [String], default: [] },
}, { timestamps: true });

biDashboardSchema.index({ userId: 1, status: 1 });
biDashboardSchema.index({ organizationId: 1, status: 1 });
biDashboardSchema.index({ name: 'text', description: 'text' });
export default mongoose.model('BiDashboard', biDashboardSchema);
