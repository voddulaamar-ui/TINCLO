import mongoose from 'mongoose';
const keyResultSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  target:   { type: Number, default: 100 },
  current:  { type: Number, default: 0 },
  unit:     { type: String, default: '%' },
  status:   { type: String, enum: ['on_track', 'at_risk', 'behind', 'completed'], default: 'on_track' },
}, { _id: true });

const okrGoalSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  employeeId:     { type: String, default: null, index: true },
  departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  level:          { type: String, enum: ['company', 'department', 'team', 'individual'], default: 'individual' },
  objective:      { type: String, required: true },
  keyResults:     { type: [keyResultSchema], default: [] },
  progress:       { type: Number, default: 0, min: 0, max: 100 },
  period:         { type: String, default: '' },
  status:         { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  parentGoalId:   { type: mongoose.Schema.Types.ObjectId, default: null },
  deadline:       { type: Date, default: null },
}, { timestamps: true });

okrGoalSchema.index({ organizationId: 1, level: 1, status: 1 });
export default mongoose.model('OkrGoal', okrGoalSchema);
