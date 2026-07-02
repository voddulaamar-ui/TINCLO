import mongoose from 'mongoose';

const jobViewSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

jobViewSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export default mongoose.model('JobView', jobViewSchema);
