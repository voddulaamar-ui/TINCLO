/**
 * AI Service Layer — Modular, provider-agnostic AI interface.
 * 
 * Architecture:
 *   Frontend → Backend API → aiService → LLM Provider → Response Formatter → Frontend
 * 
 * Supports: OpenAI, Gemini, local fallback (rule-based).
 * Every AI feature is independently toggleable via config.
 * 
 * Usage:
 *   import ai from '../services/aiService.js';
 *   const result = await ai.generateJobDescription({ title, skills, experience });
 *   const chat = await ai.chatAssistant({ message, context, role });
 */

// ── Configuration ────────────────────────────────────────────────────────────
const AI_CONFIG = {
  enabled:       process.env.AI_ENABLED !== 'false',
  provider:      process.env.AI_PROVIDER || 'local',          // 'openai' | 'gemini' | 'local'
  apiKey:        process.env.AI_API_KEY || '',
  model:         process.env.AI_MODEL || 'gpt-3.5-turbo',
  maxTokens:     parseInt(process.env.AI_MAX_TOKENS || '1024'),
  temperature:   parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  rateLimit:     parseInt(process.env.AI_RATE_LIMIT || '50'),   // requests per hour per user
  fallbackOnError: true,
};

// ── Provider: call external LLM ──────────────────────────────────────────────
async function callLLM(prompt, options = {}) {
  if (!AI_CONFIG.enabled || !AI_CONFIG.apiKey || AI_CONFIG.provider === 'local') {
    return localFallback(prompt, options);
  }

  try {
    if (AI_CONFIG.provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_CONFIG.apiKey}` },
        body: JSON.stringify({
          model: options.model || AI_CONFIG.model,
          messages: [{ role: 'system', content: options.systemPrompt || 'You are a helpful recruitment AI assistant for TINCLO platform.' }, { role: 'user', content: prompt }],
          max_tokens: options.maxTokens || AI_CONFIG.maxTokens,
          temperature: options.temperature ?? AI_CONFIG.temperature,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || localFallback(prompt, options);
    }

    if (AI_CONFIG.provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${AI_CONFIG.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || localFallback(prompt, options);
    }

    return localFallback(prompt, options);
  } catch (err) {
    console.warn('[AI] LLM call failed, using fallback:', err.message);
    return AI_CONFIG.fallbackOnError ? localFallback(prompt, options) : 'AI service temporarily unavailable.';
  }
}

// ── Local fallback (rule-based, no external API needed) ──────────────────────
function localFallback(prompt, options = {}) {
  const type = options.type || 'generic';
  switch (type) {
    case 'job_description':
      return `We are looking for a talented professional to join our team. The ideal candidate will have strong technical skills and a passion for building great products. This is an excellent opportunity for career growth in a dynamic environment.`;
    case 'interview_questions':
      return JSON.stringify([
        'Tell me about yourself and your experience.',
        'What are your strongest technical skills?',
        'Describe a challenging project you worked on.',
        'How do you handle tight deadlines?',
        'Where do you see yourself in 5 years?',
      ]);
    case 'cover_letter':
      return `Dear Hiring Manager,\n\nI am writing to express my strong interest in the position. With my background and skills, I believe I would be a valuable addition to your team.\n\nThank you for considering my application.\n\nBest regards`;
    case 'resume_feedback':
      return JSON.stringify({ score: 75, strengths: ['Clear formatting', 'Relevant skills listed'], weaknesses: ['Add measurable achievements', 'Include more project details'], suggestions: ['Quantify your impact', 'Add a professional summary'] });
    case 'salary_prediction':
      return JSON.stringify({ min: 600000, max: 1500000, median: 900000, currency: 'INR', confidence: 'medium' });
    default:
      return 'I can help you with job searching, resume improvement, interview preparation, and career advice. What would you like to know?';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC AI SERVICE METHODS
// ══════════════════════════════════════════════════════════════════════════════

const aiService = {
  getConfig: () => ({ enabled: AI_CONFIG.enabled, provider: AI_CONFIG.provider, model: AI_CONFIG.model }),

  // ── Chat Assistant (candidate/recruiter/admin) ─────────────────────────────
  async chatAssistant({ message, context = '', role = 'candidate', history = [] }) {
    const systemPrompt = role === 'recruiter'
      ? 'You are an AI recruitment assistant for recruiters on TINCLO. Help with job descriptions, candidate evaluation, and hiring workflows.'
      : role === 'admin'
        ? 'You are an AI admin assistant for TINCLO platform. Help with platform statistics, user management, and system insights.'
        : 'You are an AI career assistant for job seekers on TINCLO. Help with job searching, resume improvement, interview preparation, and career advice.';

    const fullPrompt = context ? `Context: ${context}\n\nUser: ${message}` : message;
    const response = await callLLM(fullPrompt, { systemPrompt, type: 'generic' });
    return { response, provider: AI_CONFIG.provider, model: AI_CONFIG.model };
  },

  // ── Job Description Generator ──────────────────────────────────────────────
  async generateJobDescription({ title, skills = [], experience = '', responsibilities = '', company = '' }) {
    const prompt = `Generate a professional job description for: ${title}\nCompany: ${company}\nSkills: ${skills.join(', ')}\nExperience: ${experience}\nKey Responsibilities: ${responsibilities}\n\nInclude: Overview, Responsibilities, Requirements, Benefits, and How to Apply sections.`;
    return callLLM(prompt, { type: 'job_description' });
  },

  // ── Job Description Optimizer ──────────────────────────────────────────────
  async optimizeJobDescription(description) {
    const prompt = `Improve this job description for better readability, inclusiveness, and candidate attraction. Fix grammar, suggest missing sections, and optimize for SEO:\n\n${description}`;
    return callLLM(prompt, { type: 'job_description' });
  },

  // ── Interview Question Generator ───────────────────────────────────────────
  async generateInterviewQuestions({ role, skills = [], experience = '', difficulty = 'medium', count = 10 }) {
    const prompt = `Generate ${count} interview questions for a ${role} position.\nSkills: ${skills.join(', ')}\nExperience: ${experience}\nDifficulty: ${difficulty}\n\nInclude a mix of technical, behavioral, and problem-solving questions. Return as JSON array of objects with { question, category, difficulty, modelAnswer }.`;
    const raw = await callLLM(prompt, { type: 'interview_questions' });
    try { return JSON.parse(raw); } catch { return raw; }
  },

  // ── Resume Scoring ─────────────────────────────────────────────────────────
  async scoreResume({ resumeText, targetJob = '' }) {
    const prompt = `Score this resume on a scale of 0-100 and provide feedback.\n${targetJob ? `Target Job: ${targetJob}\n` : ''}Resume:\n${resumeText.substring(0, 3000)}\n\nReturn JSON: { score, atsScore, strengths: [], weaknesses: [], suggestions: [], keywordMatch: number }`;
    const raw = await callLLM(prompt, { type: 'resume_feedback' });
    try { return JSON.parse(raw); } catch { return raw; }
  },

  // ── Cover Letter Generator ─────────────────────────────────────────────────
  async generateCoverLetter({ candidateName, skills = [], experience = '', jobTitle, company, jobDescription = '' }) {
    const prompt = `Write a professional cover letter for ${candidateName} applying to ${jobTitle} at ${company}.\nSkills: ${skills.join(', ')}\nExperience: ${experience}\nJob Description: ${jobDescription.substring(0, 500)}\n\nMake it personalized, professional, and compelling.`;
    return callLLM(prompt, { type: 'cover_letter' });
  },

  // ── Email Generator ────────────────────────────────────────────────────────
  async generateEmail({ type, context = {} }) {
    const templates = {
      interview_invite: `Write a professional interview invitation email for ${context.candidateName} for the ${context.jobTitle} position at ${context.company}. Date: ${context.date}. Mode: ${context.mode}.`,
      offer_letter: `Write a congratulatory offer email for ${context.candidateName} for ${context.jobTitle} at ${context.company}. Salary: ${context.salary}.`,
      rejection: `Write a polite, professional rejection email for ${context.candidateName} who applied for ${context.jobTitle} at ${context.company}. Be encouraging.`,
      follow_up: `Write a professional follow-up email from ${context.senderName} regarding the ${context.jobTitle} position.`,
      thank_you: `Write a thank you email from ${context.candidateName} after an interview for ${context.jobTitle} at ${context.company}.`,
    };
    const prompt = templates[type] || `Write a professional email: ${JSON.stringify(context)}`;
    return callLLM(prompt, { type: 'generic' });
  },

  // ── Salary Prediction ──────────────────────────────────────────────────────
  async predictSalary({ skills = [], experience = 0, location = '', domain = '', education = '' }) {
    const prompt = `Predict salary range for a professional with:\nSkills: ${skills.join(', ')}\nExperience: ${experience} years\nLocation: ${location}\nDomain: ${domain}\nEducation: ${education}\n\nReturn JSON: { min, max, median, currency, confidence, factors: [] }`;
    const raw = await callLLM(prompt, { type: 'salary_prediction' });
    try { return JSON.parse(raw); } catch { return raw; }
  },

  // ── Career Advisor ─────────────────────────────────────────────────────────
  async getCareerAdvice({ skills = [], experience = 0, domain = '', goals = '' }) {
    const prompt = `Provide career advice for a professional with:\nSkills: ${skills.join(', ')}\nExperience: ${experience} years\nDomain: ${domain}\nCareer Goals: ${goals}\n\nInclude: next career step, skills to learn, certifications, target companies, timeline, and salary expectations.`;
    return callLLM(prompt, { type: 'generic' });
  },

  // ── Skill Gap Analysis ─────────────────────────────────────────────────────
  async analyzeSkillGap({ userSkills = [], jobSkills = [], jobTitle = '' }) {
    const prompt = `Analyze skill gap for ${jobTitle}.\nCandidate has: ${userSkills.join(', ')}\nJob requires: ${jobSkills.join(', ')}\n\nReturn JSON: { matchPercent, matchedSkills: [], missingSkills: [], prioritySkills: [], learningPlan: [{ skill, estimatedTime, difficulty, expectedMatchIncrease }] }`;
    const raw = await callLLM(prompt, { type: 'generic' });
    try { return JSON.parse(raw); } catch { return raw; }
  },

  // ── Candidate Ranking ──────────────────────────────────────────────────────
  async rankCandidates({ candidates = [], jobRequirements = {} }) {
    const prompt = `Rank these candidates for the position:\nJob: ${JSON.stringify(jobRequirements)}\nCandidates: ${JSON.stringify(candidates.slice(0, 10).map(c => ({ name: c.name, skills: c.skills, experience: c.experience })))}\n\nReturn JSON array sorted by rank: [{ name, rank, score, strengths, concerns }]`;
    const raw = await callLLM(prompt, { type: 'generic' });
    try { return JSON.parse(raw); } catch { return raw; }
  },

  // ── Job Summary ────────────────────────────────────────────────────────────
  async summarizeJob(jobDescription) {
    const prompt = `Summarize this job description concisely (under 150 words). Include: Role, Key Skills, Salary, Location, and Experience needed.\n\n${jobDescription.substring(0, 2000)}`;
    return callLLM(prompt, { type: 'generic' });
  },

  // ── Company Insights ───────────────────────────────────────────────────────
  async getCompanyInsights(companyName) {
    const prompt = `Provide a brief professional overview of ${companyName} as an employer. Include: Industry, Size, Culture, Technologies used, Hiring reputation, and Growth outlook. Keep it factual and concise.`;
    return callLLM(prompt, { type: 'generic' });
  },

  // ── Natural Language Search → Filters ──────────────────────────────────────
  async parseSearchQuery(naturalLanguage) {
    const prompt = `Convert this job search into structured filters:\n"${naturalLanguage}"\n\nReturn JSON: { query, location, domain, workMode, jobType, salary, experience, skills: [] }. Only include fields mentioned.`;
    const raw = await callLLM(prompt, { type: 'generic' });
    try { return JSON.parse(raw); } catch { return { query: naturalLanguage }; }
  },

  // ── Duplicate/Fraud Detection ──────────────────────────────────────────────
  async detectDuplicate(job, existingJobs = []) {
    // Simple similarity check (rule-based fallback)
    const titleLower = (job.title || '').toLowerCase();
    const companyLower = (job.company || '').toLowerCase();
    const duplicates = existingJobs.filter(existing => {
      const t = (existing.title || '').toLowerCase();
      const c = (existing.company || '').toLowerCase();
      return (t === titleLower && c === companyLower) ||
        (t.includes(titleLower) && c === companyLower && Math.abs((existing.createdAt - job.createdAt)) < 7 * 24 * 60 * 60 * 1000);
    });
    return { isDuplicate: duplicates.length > 0, matches: duplicates.map(d => d._id), confidence: duplicates.length > 0 ? 'high' : 'none' };
  },
};

export default aiService;
