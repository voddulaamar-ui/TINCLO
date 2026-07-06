import mongoose from 'mongoose';
const assetAssignmentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  employeeId:     { type: String, required: true, index: true },
  assetType:      { type: String, required: true },  // 'laptop', 'phone', 'monitor', 'id_card'
  assetName:      { type: String, default: '' },
  serialNumber:   { type: String, default: '' },
  issuedDate:     { type: Date, default: Date.now },
  returnedDate:   { type: Date, default: null },
  condition:      { type: String, enum: ['new', 'good', 'fair', 'damaged', 'returned'], default: 'new' },
  warranty:       { type: Date, default: null },
  notes:          { type: String, default: '' },
}, { timestamps: true });

assetAssignmentSchema.index({ organizationId: 1, employeeId: 1 });
export default mongoose.model('AssetAssignment', assetAssignmentSchema);
