import mongoose from 'mongoose';

const heatmapAlertSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  // Alert config
  type:         { type: String, enum: ['skill_demand', 'salary_change', 'new_hub', 'remote_increase', 'competition_drop', 'custom'], required: true },
  skill:        { type: String, default: '' },
  location:     { type: String, default: '' },
  industry:     { type: String, default: '' },
  threshold:    { type: Number, default: 10 }, // percentage change to trigger
  // Status
  active:       { type: Boolean, default: true },
  triggered:    { type: Boolean, default: false },
  triggeredAt:  { type: Date, default: null },
  triggerMessage: { type: String, default: '' },
  // Notification
  notifyEmail:  { type: Boolean, default: false },
  notifyPush:   { type: Boolean, default: true },
}, { timestamps: true });

heatmapAlertSchema.index({ userId: 1, active: 1 });
export default mongoose.model('HeatmapAlert', heatmapAlertSchema);
