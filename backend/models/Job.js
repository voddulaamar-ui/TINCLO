import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  externalId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  salary: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['Naukri', 'LinkedIn', 'Indeed', 'Glassdoor', 'Direct', 'External'],
    default: 'Naukri'
  },
  experience: {
    type: String,
    default: ''
  },
  jobType: {
    type: String,
    default: 'Full-time'
  },
  companyLogo: {
    type: String,
    default: null
  },
  isExternal: {
    type: Boolean,
    default: false
  },
  requirements: {
    type: [String],
    default: []
  },
  applyUrl: {
    type: String,
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Job', jobSchema);
