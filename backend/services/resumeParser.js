/**
 * Resume Parsing Service
 * Extracts structured data from PDF resume text.
 * Uses pdf-parse for text extraction and regex patterns for field identification.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// ── Skill dictionary for matching ────────────────────────────────────────────
const KNOWN_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'React', 'React Native', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'Spring Boot',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'DynamoDB', 'Firebase', 'Supabase',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitHub Actions', 'CI/CD',
  'HTML', 'CSS', 'Tailwind', 'SASS', 'Bootstrap', 'Material UI',
  'GraphQL', 'REST API', 'Socket.io', 'WebSocket', 'gRPC',
  'Git', 'Linux', 'Nginx', 'Apache', 'Webpack', 'Vite', 'Babel',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision',
  'Data Science', 'Pandas', 'NumPy', 'Tableau', 'Power BI', 'SQL',
  'Figma', 'Adobe XD', 'Sketch', 'UI/UX',
  'Agile', 'Scrum', 'Jira', 'Confluence',
  'Blockchain', 'Solidity', 'Web3',
];

// ── Extract email ────────────────────────────────────────────────────────────
function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

// ── Extract phone ────────────────────────────────────────────────────────────
function extractPhone(text) {
  const match = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}

// ── Extract name (first non-empty line that looks like a name) ───────────────
function extractName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    // Name is usually 2-4 words, all starting with uppercase, no special chars
    if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){0,3}$/.test(line) && line.length < 50) {
      return line;
    }
  }
  // Fallback: first line if it's short
  if (lines[0] && lines[0].length < 40 && !lines[0].includes('@')) return lines[0];
  return null;
}

// ── Extract LinkedIn URL ─────────────────────────────────────────────────────
function extractLinkedIn(text) {
  const match = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  return match ? `https://www.${match[0]}` : null;
}

// ── Extract GitHub URL ───────────────────────────────────────────────────────
function extractGitHub(text) {
  const match = text.match(/github\.com\/[a-zA-Z0-9_-]+/i);
  return match ? `https://${match[0]}` : null;
}

// ── Extract skills by matching against known skill dictionary ─────────────────
function extractSkills(text) {
  const found = new Set();
  const textLower = text.toLowerCase();
  for (const skill of KNOWN_SKILLS) {
    if (textLower.includes(skill.toLowerCase())) {
      found.add(skill);
    }
  }
  return Array.from(found);
}

// ── Extract education ────────────────────────────────────────────────────────
function extractEducation(text) {
  const education = [];
  const degreePatterns = [
    /(?:B\.?Tech|B\.?E|B\.?Sc|B\.?A|M\.?Tech|M\.?S|M\.?Sc|M\.?A|MBA|Ph\.?D|Diploma)\b[^.\n]{0,100}/gi,
    /(?:Bachelor|Master|Doctor)\s+(?:of|in)\s+[A-Za-z\s]+/gi,
  ];
  for (const pattern of degreePatterns) {
    const matches = text.match(pattern) || [];
    for (const m of matches) {
      education.push({ degree: m.trim(), institution: '', year: '' });
    }
  }
  // Try to extract years near education sections
  const yearMatches = text.match(/20[0-2]\d/g) || [];
  if (education.length > 0 && yearMatches.length > 0) {
    education[0].year = yearMatches[yearMatches.length - 1] || '';
  }
  return education.slice(0, 5); // max 5 entries
}

// ── Extract experience (years) ───────────────────────────────────────────────
function extractExperience(text) {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
  if (match) return parseInt(match[1]);
  // Count mention of company-like patterns
  const companyMentions = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+20\d{2}\s*[-–]\s*(?:Present|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi);
  return companyMentions ? companyMentions.length : 0;
}

// ── Extract projects ─────────────────────────────────────────────────────────
function extractProjects(text) {
  const projects = [];
  const sections = text.split(/projects?|portfolio/i);
  if (sections.length > 1) {
    const projectSection = sections[1].substring(0, 1000);
    const lines = projectSection.split('\n').map(l => l.trim()).filter(l => l.length > 10 && l.length < 100);
    for (const line of lines.slice(0, 5)) {
      if (/^[A-Z]/.test(line) && !line.includes('@') && !line.match(/^\d/)) {
        projects.push({ name: line, description: '', url: '' });
      }
    }
  }
  return projects.slice(0, 5);
}

// ── Main parse function ──────────────────────────────────────────────────────
/**
 * Parse a PDF resume buffer and extract structured data.
 * @param {Buffer} buffer - PDF file buffer
 * @returns {object} Extracted resume data
 */
export async function parseResume(buffer) {
  const pdf = await pdfParse(buffer);
  const text = pdf.text || '';

  if (!text || text.length < 50) {
    throw new Error('Could not extract text from PDF. The file may be image-based or empty.');
  }

  const result = {
    rawText:    text.substring(0, 5000), // first 5000 chars for reference
    name:       extractName(text),
    email:      extractEmail(text),
    phone:      extractPhone(text),
    skills:     extractSkills(text),
    education:  extractEducation(text),
    experience: extractExperience(text),
    projects:   extractProjects(text),
    linkedin:   extractLinkedIn(text),
    github:     extractGitHub(text),
    pageCount:  pdf.numpages || 1,
    wordCount:  text.split(/\s+/).length,
  };

  return result;
}

/**
 * Calculate resume/profile strength score (0-100).
 * @param {object} user - User document
 * @returns {{ score: number, missing: string[], suggestions: string[] }}
 */
export function calculateProfileStrength(user) {
  const checks = [
    { field: 'name',       weight: 5,  label: 'Full Name' },
    { field: 'email',      weight: 5,  label: 'Email' },
    { field: 'phone',      weight: 5,  label: 'Phone Number' },
    { field: 'location',   weight: 5,  label: 'Location' },
    { field: 'bio',        weight: 5,  label: 'Professional Bio' },
    { field: 'resumeUrl',  weight: 15, label: 'Resume' },
    { field: 'skills',     weight: 15, label: 'Skills (3+)', check: (v) => Array.isArray(v) && v.length >= 3 },
    { field: 'domain',     weight: 5,  label: 'Domain/Specialization' },
    { field: 'experienceYears', weight: 5, label: 'Experience', check: (v) => v > 0 },
    { field: 'education',  weight: 10, label: 'Education', check: (v) => Array.isArray(v) && v.length > 0 },
    { field: 'projects',   weight: 10, label: 'Projects', check: (v) => Array.isArray(v) && v.length > 0 },
    { field: 'linkedin',   weight: 5,  label: 'LinkedIn Profile' },
    { field: 'github',     weight: 5,  label: 'GitHub Profile' },
    { field: 'profilePicture', weight: 5, label: 'Profile Picture' },
  ];

  let score = 0;
  const missing = [];
  const suggestions = [];

  for (const check of checks) {
    const value = user[check.field];
    const passed = check.check ? check.check(value) : Boolean(value);
    if (passed) {
      score += check.weight;
    } else {
      missing.push(check.label);
      suggestions.push(`Add your ${check.label.toLowerCase()} to improve visibility to recruiters.`);
    }
  }

  return { score: Math.min(100, score), missing, suggestions: suggestions.slice(0, 5) };
}

export default { parseResume, calculateProfileStrength };
