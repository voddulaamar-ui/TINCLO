/**
 * matchingService.js
 * Rule-based job-candidate matching.
 * Completely independent from UI — usable from any route or script.
 *
 * Score weights (total = 100):
 *   Skills match    → 50 pts
 *   Domain match    → 20 pts
 *   Location match  → 20 pts
 *   Experience fit  → 10 pts
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise a string for comparison: lowercase, trim, remove punctuation */
const norm = (s = '') => s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');

/** Convert an experience string like "2-4 years" or "3+ years" to a numeric range */
function parseExperienceRange(str = '') {
  if (!str) return null;
  const s = str.toLowerCase();
  // "X+ years" or "X years"
  const plus = s.match(/(\d+)\+/);
  if (plus) return { min: parseInt(plus[1], 10), max: 99 };
  // "X-Y years"
  const range = s.match(/(\d+)\s*[-–to]\s*(\d+)/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  // single number
  const single = s.match(/(\d+)/);
  if (single) { const n = parseInt(single[1], 10); return { min: n, max: n }; }
  return null;
}

/** True if two strings are semantically equal after normalisation */
const looslyEquals = (a, b) => norm(a) === norm(b);

/** True if target string contains the needle (normalised substring match) */
const containsMatch = (target, needle) => norm(target).includes(norm(needle));

// ── Core scorer ───────────────────────────────────────────────────────────────

/**
 * Compute a match between a candidate profile and a job.
 *
 * @param {object} user  – Mongoose User document (or plain object with same fields)
 * @param {object} job   – Mongoose Job document (or plain object with same fields)
 * @returns {{ matchScore: number, matchDetails: object }}
 */
export function computeMatch(user, job) {
  // ── Collect job skills (combine skillsRequired + requirements for compat) ──
  const jobSkills = [
    ...(job.skillsRequired || []),
    ...(job.requirements   || []),
  ].map(norm).filter(Boolean);

  const userSkills = (user.skills || []).map(norm).filter(Boolean);

  // ── 1. Skills (50 pts) ────────────────────────────────────────────────────
  const matchedSkills = [];
  const missingSkills = [];

  for (const js of jobSkills) {
    const hit = userSkills.some(us => containsMatch(js, us) || containsMatch(us, js));
    if (hit) {
      // Store the original (un-normalised) label from the job
      const original = (job.skillsRequired || job.requirements || []).find(
        s => norm(s) === js,
      ) || js;
      matchedSkills.push(original);
    } else {
      const original = (job.skillsRequired || job.requirements || []).find(
        s => norm(s) === js,
      ) || js;
      missingSkills.push(original);
    }
  }

  const skillScore = jobSkills.length === 0
    ? 25 // no required skills → give half credit
    : Math.round((matchedSkills.length / jobSkills.length) * 50);

  // ── 2. Domain (20 pts) ────────────────────────────────────────────────────
  const jobDomain  = norm(job.domain  || '');
  const userDomain = norm(user.domain || '');
  const matchedDomain =
    !!jobDomain &&
    !!userDomain &&
    (containsMatch(jobDomain, userDomain) || containsMatch(userDomain, jobDomain));
  const domainScore = matchedDomain ? 20 : 0;

  // ── 3. Location (20 pts) ──────────────────────────────────────────────────
  const jobLocation       = norm(job.location || '');
  const userPrefLocations = (user.preferredLocations || []).map(norm);
  const isRemote =
    jobLocation.includes('remote') ||
    norm(job.workMode || '').includes('remote');

  const matchedLocation =
    isRemote ||
    userPrefLocations.some(
      ul => containsMatch(jobLocation, ul) || containsMatch(ul, jobLocation),
    );
  const locationScore = matchedLocation ? 20 : 0;

  // ── 4. Experience (10 pts) ────────────────────────────────────────────────
  const expStr  = job.experienceRequired || job.experience || '';
  const expRange = parseExperienceRange(expStr);
  const userExp  = typeof user.experienceYears === 'number' ? user.experienceYears : 0;

  let experienceMatch = false;
  if (!expRange) {
    experienceMatch = true; // no requirement specified → pass
  } else {
    experienceMatch = userExp >= expRange.min && userExp <= expRange.max;
  }
  const expScore = experienceMatch ? 10 : 0;

  // ── Total ─────────────────────────────────────────────────────────────────
  const matchScore = Math.min(100, skillScore + domainScore + locationScore + expScore);

  return {
    matchScore,
    matchDetails: {
      matchedSkills,
      missingSkills,
      matchedDomain,
      matchedLocation,
      experienceMatch,
    },
  };
}

/**
 * Sort an array of jobs by match score (desc), then by createdAt / postedAt (desc).
 * Each job should already have { matchScore, matchDetails } attached.
 *
 * @param {{ job: object, matchScore: number }[]} scoredJobs
 * @returns sorted array
 */
export function sortByMatchThenDate(scoredJobs) {
  return [...scoredJobs].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const da = new Date(a.createdAt || a.postedAt || 0).getTime();
    const db = new Date(b.createdAt || b.postedAt || 0).getTime();
    return db - da;
  });
}
