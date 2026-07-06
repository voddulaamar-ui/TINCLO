import mongoose from 'mongoose';

/**
 * Candidate's position in a job's hiring pipeline.
 * Used for the Kanban board and pipeline tracking.
 */
const candidatePipelineSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  candidateId:    { type: String, required: true, index: true },
  matchId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },

  // Pipeline stage
  stage: {
    type: String,
    enum: ['applied', 'screening', 'technical', 'hr', 'manager', 'offer', 'joined', 'rejected', 'withdrawn'],
    default: 'applied',
    index: true,
  },
  stageOrder:     { type: Number, default: 0 },           // for drag-and-drop ordering within a stage

  // Assignment
  assignedTo:     { type: String, default: null },         // User.userId of assigned recruiter
  assignedAt:     { type: Date, default: null },
  assignmentType: { type: String, enum: ['manual', 'auto', 'round_robin', 'workload'], default: 'manual' },

  // Rating
  overallRating:  { type: Number, min: 0, max: 5, default: 0 },

  // Rejection
  rejectionReason:{ type: String, default: '' },
  rejectedBy:     { type: String, default: null },
  rejectedAt:     { type: Date, default: null },

  // Timeline events
  stageHistory: [{
    stage:      { type: String },
    movedBy:    { type: String },
    movedAt:    { type: Date, default: Date.now },
    notes:      { type: String, default: '' },
  }],
}, { timestamps: true });

candidatePipelineSchema.index({ organizationId: 1, jobId: 1, stage: 1 });
candidatePipelineSchema.index({ organizationId: 1, jobId: 1, candidateId: 1 }, { unique: true });
candidatePipelineSchema.index({ assignedTo: 1, stage: 1 });

export default mongoose.model('CandidatePipeline', candidatePipelineSchema);
