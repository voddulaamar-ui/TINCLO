import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code:           { type: String, required: true, unique: true, uppercase: true, index: true },
  type:           { type: String, enum: ['percentage', 'fixed', 'trial_extension', 'extra_seats', 'extra_storage'], default: 'percentage' },
  value:          { type: Number, required: true },  // % or fixed amount or days or count
  maxUses:        { type: Number, default: 0 },      // 0 = unlimited
  usedCount:      { type: Number, default: 0 },
  minPlanKey:     { type: String, default: null },    // restrict to certain plans
  applicablePlans:{ type: [String], default: [] },    // ['starter', 'pro']
  expiresAt:      { type: Date, default: null },
  isActive:       { type: Boolean, default: true },
  createdBy:      { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);
