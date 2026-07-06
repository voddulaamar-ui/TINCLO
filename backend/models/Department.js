import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true, trim: true },
  description:    { type: String, default: '' },
  headUserId:     { type: String, default: null },          // department head
  memberCount:    { type: Number, default: 0 },
  jobCount:       { type: Number, default: 0 },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export default mongoose.model('Department', departmentSchema);
