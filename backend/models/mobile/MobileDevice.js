import mongoose from 'mongoose';

const mobileDeviceSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  deviceId:     { type: String, required: true },
  platform:     { type: String, enum: ['android', 'ios', 'tablet'], required: true },
  model:        { type: String, default: '' },
  osVersion:    { type: String, default: '' },
  appVersion:   { type: String, default: '' },
  pushToken:    { type: String, default: null },
  pushProvider: { type: String, enum: ['fcm', 'apns', 'none'], default: 'fcm' },
  isTrusted:    { type: Boolean, default: false },
  lastActiveAt: { type: Date, default: Date.now },
  locale:       { type: String, default: 'en' },
  timezone:     { type: String, default: 'UTC' },
  isActive:     { type: Boolean, default: true, index: true },
}, { timestamps: true });

mobileDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
mobileDeviceSchema.index({ pushToken: 1 });
export default mongoose.model('MobileDevice', mobileDeviceSchema);
