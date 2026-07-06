import mongoose from 'mongoose';

/**
 * Global platform configuration — singleton document.
 */
const systemSettingsSchema = new mongoose.Schema({
  key:   { type: String, default: 'global', unique: true },
  // Branding
  appName:        { type: String, default: 'TINCLO' },
  logo:           { type: String, default: null },
  theme:          { type: String, default: 'default' },
  // Operations
  maintenanceMode:{ type: Boolean, default: false },
  maintenanceMsg: { type: String, default: '' },
  timezone:       { type: String, default: 'Asia/Kolkata' },
  languages:      { type: [String], default: ['en'] },
  // Providers
  emailProvider:  { type: String, default: 'smtp' },
  storageProvider:{ type: String, default: 'cloudinary' },
  aiProvider:     { type: String, default: 'local' },
  paymentProvider:{ type: String, default: 'razorpay' },
  pushProvider:   { type: String, default: 'web' },
  // Limits
  maxFileSize:    { type: Number, default: 5242880 },  // 5MB
  maxResumeSize:  { type: Number, default: 5242880 },
  // Updated by
  updatedBy:      { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('SystemSettings', systemSettingsSchema);
