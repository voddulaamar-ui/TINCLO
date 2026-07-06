import mongoose from 'mongoose';
const widgetSchema = new mongoose.Schema({
  type:     { type: String, required: true },  // 'chart', 'kpi', 'table', 'map', 'funnel'
  title:    { type: String, default: '' },
  dataSource:{ type: String, default: '' },
  config:   { type: mongoose.Schema.Types.Mixed, default: {} },
  position: { x: Number, y: Number, w: Number, h: Number },
}, { _id: true });

const dashboardLayoutSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  userId:         { type: String, required: true, index: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  widgets:        { type: [widgetSchema], default: [] },
  isDefault:      { type: Boolean, default: false },
  isShared:       { type: Boolean, default: false },
}, { timestamps: true });

dashboardLayoutSchema.index({ userId: 1, name: 1 });
export default mongoose.model('DashboardLayout', dashboardLayoutSchema);
