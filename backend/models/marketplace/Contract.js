import mongoose from 'mongoose';
const contractSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceProject', index: true },
  clientId:     { type: String, required: true, index: true },
  freelancerId: { type: String, required: true, index: true },
  type:         { type: String, enum: ['freelance', 'consulting', 'nda', 'internship', 'employment'], default: 'freelance' },
  title:        { type: String, default: '' },
  terms:        { type: String, default: '' },
  amount:       { type: Number, default: 0 },
  currency:     { type: String, default: 'INR' },
  startDate:    { type: Date, default: null },
  endDate:      { type: Date, default: null },
  status:       { type: String, enum: ['draft', 'sent', 'signed', 'active', 'completed', 'terminated', 'disputed'], default: 'draft', index: true },
  signedByClient: { type: Boolean, default: false },
  signedByFreelancer: { type: Boolean, default: false },
  signedAt:     { type: Date, default: null },
  documentUrl:  { type: String, default: null },
}, { timestamps: true });

contractSchema.index({ clientId: 1, status: 1 });
contractSchema.index({ freelancerId: 1, status: 1 });
export default mongoose.model('Contract', contractSchema);
