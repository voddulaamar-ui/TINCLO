import mongoose from 'mongoose';

const scenarioSchema = new mongoose.Schema({
  targetRole:     { type: String, required: true },
  timeline:       { type: String, default: '' },
  salaryRange:    { type: String, default: '' },
  missingSkills:  { type: [String], default: [] },
  learningHours:  { type: Number, default: 0 },
  successProbability: { type: String, enum: ['low', 'medium', 'high', 'very_high'], default: 'medium' },
  riskLevel:      { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  demandScore:    { type: Number, default: 50 },
  companies:      { type: [String], default: [] },
  locations:      { type: [String], default: [] },
  milestones:     [{ title: String, timeline: String, skills: [String] }],
}, { _id: true });

const careerSimulationSchema = new mongoose.Schema({
  userId:         { type: String, required: true, index: true },
  // Current state
  currentRole:    { type: String, default: '' },
  currentScore:   { type: Number, default: 0 },
  currentSkills:  { type: [String], default: [] },
  experienceYears:{ type: Number, default: 0 },
  // Scenarios
  scenarios:      { type: [scenarioSchema], default: [] },
  selectedScenario: { type: Number, default: 0 },
  // Salary forecast
  salaryForecast: {
    current:      { type: String, default: '' },
    oneYear:      { type: String, default: '' },
    threeYear:    { type: String, default: '' },
    fiveYear:     { type: String, default: '' },
    tenYear:      { type: String, default: '' },
  },
  // Risk
  riskAnalysis: {
    automationRisk: { type: String, default: 'low' },
    skillObsolescence: { type: String, default: 'low' },
    marketCompetition: { type: String, default: 'medium' },
    mitigationPlan: { type: [String], default: [] },
  },
  // Growth
  growthPotential: { type: Number, default: 0 },
  alternativeRoles:{ type: [String], default: [] },
  futureSkills:   { type: [String], default: [] },
  // Report
  reportUrl:      { type: String, default: null },
  // Meta
  status:         { type: String, enum: ['draft', 'completed', 'archived'], default: 'completed' },
  generatedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

careerSimulationSchema.index({ userId: 1, createdAt: -1 });
export default mongoose.model('CareerSimulation', careerSimulationSchema);
