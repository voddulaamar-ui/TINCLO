import mongoose from 'mongoose';

/**
 * Stores browser push notification subscriptions and device tokens.
 */
const pushSubscriptionSchema = new mongoose.Schema({
  userId:     { type: String, required: true, index: true },
  endpoint:   { type: String, required: true },
  keys: {
    p256dh: { type: String, default: '' },
    auth:   { type: String, default: '' },
  },
  // Device info
  deviceType: { type: String, default: 'web' },     // 'web', 'android', 'ios'
  browser:    { type: String, default: '' },
  os:         { type: String, default: '' },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
