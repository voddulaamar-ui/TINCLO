/**
 * useJobAge — utilities for job freshness timestamps, badges, and filters
 */

const LAST_VISIT_KEY = 'tinclo_last_visit';

/** Save current time as the user's last visit (called when they open the job browser) */
export function recordVisit() {
  localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
}

/** Get the ISO string of the last recorded visit, or null */
export function getLastVisit() {
  return localStorage.getItem(LAST_VISIT_KEY);
}

/**
 * Compute a human-readable "Posted X ago" label.
 * Falls back to "Recently" if no valid date is provided.
 */
export function timeAgo(dateInput) {
  if (!dateInput) return 'Recently';
  const now = Date.now();
  const then = new Date(dateInput).getTime();
  if (isNaN(then)) return 'Recently';
  const diffMs = now - then;
  if (diffMs < 0) return 'Just now';

  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);
  const weeks = Math.floor(days / 7);

  if (mins < 2)    return 'Just now';
  if (mins < 60)   return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  if (hours < 24)  return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7)    return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (weeks < 5)   return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  return new Date(dateInput).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Return badge info for a job:
 *   { label: 'New', color: 'green'  }  — posted within 24 h
 *   { label: 'Today', color: 'blue' }  — posted within 48 h
 *   { label: 'Recent', color: 'purple' } — posted within 72 h
 *   null — older than 72 h
 *
 * For mock jobs (no createdAt / static _ids like 'ext_1') we deterministically
 * vary the badge so the UI is still demonstrable.
 */
export function getJobBadge(job) {
  const rawDate = job.createdAt || job.postedAt || job.datePosted;

  // Mock / external jobs without a real timestamp: derive a deterministic pseudo-age
  if (!rawDate) {
    const id = String(job._id || job.id || '');
    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const pseudoHours = hash % 96; // 0 – 95 h
    if (pseudoHours < 24)  return { label: 'New',    color: 'green' };
    if (pseudoHours < 48)  return { label: 'Today',  color: 'blue' };
    if (pseudoHours < 72)  return { label: 'Recent', color: 'purple' };
    return null;
  }

  const ageMs = Date.now() - new Date(rawDate).getTime();
  const ageH  = ageMs / 3_600_000;
  if (ageH < 24)  return { label: 'New',    color: 'green' };
  if (ageH < 48)  return { label: 'Today',  color: 'blue' };
  if (ageH < 72)  return { label: 'Recent', color: 'purple' };
  return null;
}

/**
 * Return true if this job was added after the user's previous visit.
 */
export function isNewSinceLastVisit(job, lastVisitIso) {
  if (!lastVisitIso) return false;
  const rawDate = job.createdAt || job.postedAt || job.datePosted;
  if (!rawDate) return false;
  return new Date(rawDate) > new Date(lastVisitIso);
}

/**
 * Sort jobs newest-first by createdAt.
 * Jobs without a date are placed after jobs that have one.
 */
export function sortNewest(jobs) {
  return [...jobs].sort((a, b) => {
    const da = a.createdAt || a.postedAt || null;
    const db = b.createdAt || b.postedAt || null;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return new Date(db) - new Date(da);
  });
}

/**
 * Filter jobs by time window.
 * @param {'all'|'newest'|'today'|'week'} filter
 */
export function filterByTime(jobs, filter) {
  if (filter === 'all') return jobs;
  const now = Date.now();
  return jobs.filter((job) => {
    const rawDate = job.createdAt || job.postedAt || null;
    // For mock jobs without dates, use deterministic pseudo-age
    if (!rawDate) {
      const id = String(job._id || job.id || '');
      const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const pseudoHours = hash % 96;
      if (filter === 'newest') return pseudoHours < 72;
      if (filter === 'today')  return pseudoHours < 24;
      if (filter === 'week')   return pseudoHours < 168;
      return true;
    }
    const ageH = (now - new Date(rawDate).getTime()) / 3_600_000;
    if (filter === 'newest') return ageH < 72;
    if (filter === 'today')  return ageH < 24;
    if (filter === 'week')   return ageH < 168;
    return true;
  });
}
