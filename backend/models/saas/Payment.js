import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  invoiceId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  amount:         { type: Number, required: true },
  currency:       { type: String, default: 'INR' },
  gateway:        { type: String, enum: ['razorpay', 'stripe', 'paypal', 'manual'], default: 'razorpay' },
  gatewayPaymentId: { type: String, default: null, index: true },
  gatewayOrderId: { type: String, default: null },
  status:         { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending', index: true },
  method:         { type: String, default: '' },  // 'card', 'upi', 'netbanking'
  receiptUrl:     { type: String, default: null },
  failureReason:  { type: String, default: '' },
  paidAt:         { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ organizationId: 1, createdAt: -1 });
export default mongoose.model('Payment', paymentSchema);
