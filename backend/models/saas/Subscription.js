import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },
  planId:         { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  planKey:        { type: String, required: true, index: true },
  billingCycle:   { type: String, enum: ['monthly', 'yearly', 'custom'], default: 'monthly' },
  status:         { type: String, enum: ['trial', 'active', 'past_due', 'expired', 'suspended', 'cancelled'], default: 'trial', index: true },
  // Dates
  startDate:      { type: Date, default: Date.now },
  endDate:        { type: Date, required: true },
  trialEndsAt:    { type: Date, default: null },
  cancelledAt:    { type: Date, default: null },
  // Payment
  paymentGateway: { type: String, enum: ['razorpay', 'stripe', 'manual', 'none'], default: 'none' },
  gatewaySubscriptionId: { type: String, default: null },
  gatewayCustomerId:     { type: String, default: null },
  lastPaymentAt:  { type: Date, default: null },
  nextBillingAt:  { type: Date, default: null },
  amount:         { type: Number, default: 0 },
  currency:       { type: String, default: 'INR' },
  // Add-ons
  addOns: [{
    key:    { type: String },
    name:   { type: String },
    quantity:{ type: Number, default: 1 },
    price:  { type: Number, default: 0 },
  }],
  // Coupon
  couponCode:     { type: String, default: null },
  discountPercent:{ type: Number, default: 0 },
}, { timestamps: true });

subscriptionSchema.index({ status: 1, endDate: 1 });
export default mongoose.model('Subscription', subscriptionSchema);
