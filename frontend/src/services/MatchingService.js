/**
 * MatchingService.js  — client-side rule-based job matching
 * Mirrors backend/services/matchingService.js so the UI can show
 * match scores instantly without a round-trip.
 *
 * Score weights (total = 100):
 *   Skills match    → 50 pts
 *   Domain match    → 20 pts
 *   Location match  → 20 pts
 *   Experience fit  → 10 pts
 */

const norm = (s = '') => s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');

function parseExperienceRange(str = '') {
  if (!str) return null;
  const s = str.toLowerCase();
  const plus = s.match(/(\d+)\+/);
  if (plus) return { min: parseInt(plus[1], 10), max: 99 };
  const range = s.match(/(\d+)\s*[-–to]\s*(\d+)/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  const single = s.match(/(\d+)/);
  if (single) { const n = parseInt(single[1], 10); return { min: n, max: n }; }
  return null;
}

const containsMatch = (target, needle) => norm(target).includes(norm(needle));

/**
 * Compute match between a user profile object and a job object.
 * @param {object} user  – { skills, domain, experienceYears, preferredLocations }
 * @param {object} job   – { skillsRequired, requirements, domain, workMode, location,
 *                           experienceRequired, experience }
 * @returns {{ matchScore: number, matchDetails: object }}
 */
export function computeMatch(user, job) {
  if (!user || !job) return { matchScore: 0, matchDetails: { matchedSkills: [], missingSkills: [], matchedDomain: false, matchedLocation: false, experienceMatch: false } };

  // ── Skills (50 pts) ──────────────────────────────────────────────────────
  const jobSkillsRaw = [...(job.skillsRequired || []), ...(job.requirements || [])];
  const jobSkills    = jobSkillsRaw.map(norm).filter(Boolean);
  const userSkills   = (user.skills || []).map(norm).filter(Boolean);

  const matchedSkills = [];
  const missingSkills = [];

  for (let i = 0; i < jobSkills.length; i++) {
    const js  = jobSkills[i];
    const raw = jobSkillsRaw[i] || js;
    const hit = userSkills.some(us => containsMatch(js, us) || containsMatch(us, js));
    if (hit) matchedSkills.push(raw);
    else     missingSkills.push(raw);
  }

  const skillScore = jobSkills.length === 0 ? 25 : Math.round((matchedSkills.length / jobSkills.length) * 50);

  // ── Domain (20 pts) ──────────────────────────────────────────────────────
  const jobDomain  = norm(job.domain  || '');
  const userDomain = norm(user.domain || '');
  const matchedDomain =
    !!jobDomain && !!userDomain &&
    (containsMatch(jobDomain, userDomain) || containsMatch(userDomain, jobDomain));
  const domainScore = matchedDomain ? 20 : 0;

  // ── Location (20 pts) ────────────────────────────────────────────────────
  const jobLocation       = norm(job.location || '');
  const userPrefLocations = (user.preferredLocations || []).map(norm);
  const isRemote =
    jobLocation.includes('remote') || norm(job.workMode || '').includes('remote');
  const matchedLocation =
    isRemote ||
    userPrefLocations.some(ul => containsMatch(jobLocation, ul) || containsMatch(ul, jobLocation));
  const locationScore = matchedLocation ? 20 : 0;

  // ── Experience (10 pts) ──────────────────────────────────────────────────
  const expStr   = job.experienceRequired || job.experience || '';
  const expRange = parseExperienceRange(expStr);
  const userExp  = typeof user.experienceYears === 'number' ? user.experienceYears : 0;
  const experienceMatch = !expRange || (userExp >= expRange.min && userExp <= expRange.max);
  const expScore = experienceMatch ? 10 : 0;

  const matchScore = Math.min(100, skillScore + domainScore + locationScore + expScore);
  return { matchScore, matchDetails: { matchedSkills, missingSkills, matchedDomain, matchedLocation, experienceMatch } };
}

/**
 * Attach match scores to an array of jobs given the current user profile.
 * @param {object[]} jobs
 * @param {object|null} user
 * @returns {object[]}  jobs with { matchScore, matchDetails } attached
 */
export function scoreJobs(jobs, user) {
  if (!user || !user.skills?.length) return jobs.map(j => ({ ...j, matchScore: 0, matchDetails: null }));
  return jobs.map(j => {
    const { matchScore, matchDetails } = computeMatch(user, j);
    return { ...j, matchScore, matchDetails };
  });
}

/**
 * Sort scored jobs: highest match first, then newest.
 * @param {object[]} jobs  – must have matchScore and createdAt/postedAt
 */
export function sortByMatchThenDate(jobs) {
  return [...jobs].sort((a, b) => {
    if ((b.matchScore || 0) !== (a.matchScore || 0)) return (b.matchScore || 0) - (a.matchScore || 0);
    const da = new Date(a.createdAt || a.postedAt || 0).getTime();
    const db = new Date(b.createdAt || b.postedAt || 0).getTime();
    return db - da;
  });
}

/**
 * Compute profile completeness score (0-100) — used in Navigation badge.
 */
export function profileCompleteness(user) {
  if (!user) return 0;
  const checks = [
    !!user.name,
    !!user.email,
    !!user.phone,
    !!user.location,
    (user.skills?.length || 0) > 0,
    !!user.domain,
    user.experienceYears > 0,
    (user.preferredLocations?.length || 0) > 0,
    !!user.expectedSalary,
    !!user.bio,
    (user.education?.length || 0) > 0,
    !!user.linkedin,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Match score colour helper */
export function matchColor(score) {
  if (score >= 80) return { bg: '#c6f6d5', text: '#22543d', border: '#9ae6b4' };
  if (score >= 60) return { bg: '#bee3f8', text: '#2a4365', border: '#90cdf4' };
  if (score >= 40) return { bg: '#fefcbf', text: '#744210', border: '#f6e05e' };
  return                 { bg: '#fed7d7', text: '#742a2a', border: '#feb2b2' };
}
