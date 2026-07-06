import mongoose from 'mongoose';

const interviewRoomSchema = new mongoose.Schema({
  orgId:          { type: String, index: true, default: '' },
  createdBy:      { type: String, required: true },
  // Room details
  title:          { type: String, required: true },
  jobId:          { type: String, default: '' },
  jobTitle:       { type: String, default: '' },
  type:           { type: String, enum: ['technical', 'hr', 'behavioral', 'coding', 'system_design', 'panel', 'whiteboard'], default: 'technical' },
  // Participants
  candidateId:    { type: String, default: '' },
  candidateName:  { type: String, default: '' },
  interviewers: [{
    userId: String, name: String, role: String, isLead: { type: Boolean, default: false },
  }],
  // Schedule
  scheduledAt:    { type: Date, required: true },
  duration:       { type: Number, default: 60 }, // minutes
  timezone:       { type: String, default: 'Asia/Kolkata' },
  // Room features
  codingEnabled:  { type: Boolean, default: true },
  whiteboardEnabled: { type: Boolean, default: true },
  videoEnabled:   { type: Boolean, default: true },
  recordingEnabled: { type: Boolean, default: false },
  aiAssistEnabled:{ type: Boolean, default: true },
  // Code environment
  codeLanguage:   { type: String, default: 'javascript' },
  codeContent:    { type: String, default: '' },
  whiteboardData: { type: String, default: '' },
  // AI Generated
  transcript:     { type: String, default: '' },
  aiSummary:      { type: String, default: '' },
  aiStrengths:    { type: [String], default: [] },
  aiConcerns:     { type: [String], default: [] },
  aiRecommendation: { type: String, default: '' },
  // Meeting
  meetingUrl:     { type: String, default: '' },
  recordingUrl:   { type: String, default: '' },
  // Status
  status:         { type: String, enum: ['scheduled', 'live', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
  startedAt:      { type: Date, default: null },
  endedAt:        { type: Date, default: null },
}, { timestamps: true });

interviewRoomSchema.index({ candidateId: 1, status: 1 });
interviewRoomSchema.index({ scheduledAt: 1 });
export default mongoose.model('InterviewRoom', interviewRoomSchema);
