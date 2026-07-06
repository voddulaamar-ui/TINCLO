import mongoose from 'mongoose';

const savedSearchSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  name:      { type: String, required: true, trim: true },    // "Remote React Jobs"
  filters: {
    query:      { type: String, default: '' },
    location:   { type: String, default: '' },
    domain:     { type: String, default: '' },
    workMode:   { type: String, default: '' },
    jobType:    { type: String, default: '' },
    salary:     { type: String, default: '' },
    experience: { type: String, default: '' },
    company:    { type: String, default: '' },
    skills:     { type: [String], default: [] },
  },
  notifyOnMatch: { type: Boolean, default: true },   // send notification when new job matches
  lastCheckedAt: { type: Date, default: null },
  matchCount:    { type: Number, default: 0 },       // jobs matched since last check
}, { timestamps: true });

savedSearchSchema.index({ userId: 1, createdAt: -1 });
savedSearchSchema.index({ notifyOnMatch: 1 });

export default mongoose.model('SavedSearch', savedSearchSchema);
