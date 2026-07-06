import mongoose from 'mongoose';

/**
 * Per-user notification preferences.
 */
const notificationPreferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },

  // Channel toggles
  pushEnabled:  { type: Boolean, default: true },
  emailEnabled: { type: Boolean, default: true },

  // Category toggles
  jobNotifications:       { type: Boolean, default: true },
  messageNotifications:   { type: Boolean, default: true },
  interviewNotifications: { type: Boolean, default: true },
  offerNotifications:     { type: Boolean, default: true },
  recruiterActivity:      { type: Boolean, default: true },
  announcements:          { type: Boolean, default: true },
  marketing:              { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('NotificationPreference', notificationPreferenceSchema);
