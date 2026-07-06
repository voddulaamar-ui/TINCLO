import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  invoiceNumber:  { type: String, required: true, unique: true },
  amount:         { type: Number, required: true },
  tax:            { type: Number, default: 0 },
  total:          { type: Number, required: true },
  currency:       { type: String, default: 'INR' },
  status:         { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft', index: true },
  issueDate:      { type: Date, default: Date.now },
  dueDate:        { type: Date, required: true },
  paidAt:         { type: Date, default: null },
  planName:       { type: String, default: '' },
  billingCycle:   { type: String, default: '' },
  pdfUrl:         { type: String, default: null },
  notes:          { type: String, default: '' },
}, { timestamps: true });

invoiceSchema.index({ organizationId: 1, issueDate: -1 });
export default mongoose.model('Invoice', invoiceSchema);
