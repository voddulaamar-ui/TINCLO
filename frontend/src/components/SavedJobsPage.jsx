// SavedJobsPage — view and manage saved (not-yet-applied) jobs

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';
import { matchColor } from '../services/MatchingService';
import { timeAgo, getJobBadge } from '../hooks/useJobAge';

const SOURCE_COLORS = {
  'Naukri':    '#ff6b35', 'LinkedIn': '#0077b5', 'Indeed': '#2164f3',
  'Glassdoor': '#0caa41', 'Recruiter': '#38a169', 'External': '#764ba2',
};

const WORK_MODE_COLORS = {
  Remote: { bg: '#c6f6d5', text: '#22543d' },
  Hybrid: { bg: '#bee3f8', text: '#2a4365' },
  Onsite: { bg: '#e9d8fd', text: '#44337a' },
};

const BADGE_STYLES = {
  green:  { bg: '#c6f6d5', text: '#22543d', border: '#9ae6b4' },
  blue:   { bg: '#bee3f8', text: '#2a4365', border: '#90cdf4' },
  purple: { bg: '#e9d8fd', text: '#44337a', border: '#d6bcfa' },
};

export default function SavedJobsPage() {
  const navigate = useNavigate();
  const [matches, setMatches]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState('');
  const [sortBy, setSortBy]       = useState('match'); // 'match' | 'date' | 'company'
  const [filterDomain, setFilter] = useState('');

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; }
  })();

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    load();
  }, []); // eslint-disable-line

  const load = async () => {
    setLoading(true);
    try {
      const data = await ApiService.fetchUserMatches(currentUser.id);
      // Show only saved (not applied) matches
      setMatches(data.filter(m => !m.applied && (m.applicationStatus === 'saved' || !m.applicationStatus)));
    } catch (err) {
      // Fallback to localStorage
      try {
        const all = JSON.parse(localStorage.getItem('tinclo_matches') || '{}');
        const arr = Array.isArray(all) ? all : (all[currentUser.id] || []);
        setMatches(arr.filter(m => !m.applied));
      } catch { setMatches([]); }
    } finally { setLoading(false); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const matchIdOf = (match) => String(match._id || match.id || '');

  const persistLocalMatches = (updater) => {
    try {
      const all = JSON.parse(localStorage.getItem('tinclo_matches') || '{}');
      const current = Array.isArray(all) ? all : (all[currentUser.id] || []);
      const next = updater(current);
      if (Array.isArray(all)) {
        localStorage.setItem('tinclo_matches', JSON.stringify(next));
      } else {
        all[currentUser.id] = next;
        localStorage.setItem('tinclo_matches', JSON.stringify(all));
      }
    } catch {
      // Local cache is best-effort only.
    }
  };

  const handleUnsave = async (matchId) => {
    const id = String(matchId);
    const previous = matches;
    setMatches(prev => prev.filter(m => matchIdOf(m) !== id));
    persistLocalMatches(prev => prev.filter(m => matchIdOf(m) !== id));
    try {
      await ApiService.deleteMatch(id);
      showToast('✅ Job removed from saved list.');
    } catch (err) {
      setMatches(previous);
      showToast('⚠️ ' + (err.message || 'Failed to remove job.'));
    }
  };

  const handleMarkApplied = async (matchId) => {
    const id = String(matchId);
    const previous = matches;
    setMatches(prev => prev.filter(m => matchIdOf(m) !== id));
    persistLocalMatches(prev => prev.map(m =>
      matchIdOf(m) === id ? { ...m, applied: true, applicationStatus: 'applied' } : m
    ));
    try {
      await ApiService.updateMatchStatus(id, 'applied');
      showToast('✅ Marked as applied! Check your Application Tracker.');
    } catch (err) {
      setMatches(previous);
      showToast('⚠️ ' + (err.message || 'Failed to update status.'));
    }
  };

  // Normalise match object (handles both API shape and localStorage shape)
  const norm = (m) => ({
    id:          m._id || m.id,
    matchScore:  m.matchScore || 0,
    matchDetails:m.matchDetails || null,
    matchedAt:   m.matchedAt,
    job: m.job || (m.jobId && typeof m.jobId === 'object' ? {
      id: m.jobId._id, _id: m.jobId._id,
      title: m.jobId.title, company: m.jobId.company,
      location: m.jobId.location, salary: m.jobId.salary,
      domain: m.jobId.domain || '', workMode: m.jobId.workMode || '',
      jobType: m.jobId.jobType || 'Full-time', source: m.jobId.source,
      skillsRequired: m.jobId.skillsRequired || m.jobId.requirements || [],
      tags: m.jobId.tags || [], deadline: m.jobId.deadline || null,
      createdAt: m.jobId.createdAt, postedAt: m.jobId.postedAt,
    } : {}),
  });

  const normalised = matches.map(norm);

  // Sort
  const sorted = [...normalised].sort((a, b) => {
    if (sortBy === 'match')   return (b.matchScore || 0) - (a.matchScore || 0);
    if (sortBy === 'date')    return new Date(b.matchedAt || 0) - new Date(a.matchedAt || 0);
    if (sortBy === 'company') return (a.job.company || '').localeCompare(b.job.company || '');
    return 0;
  });

  // Domain filter
  const displayed = filterDomain
    ? sorted.filter(m => (m.job.domain || '').toLowerCase().includes(filterDomain.toLowerCase()))
    : sorted;

  // Unique domains for filter
  const domains = [...new Set(normalised.map(m => m.job.domain).filter(Boolean))];

  return (
    <>
      <NavigationLanding />
      <div className="min-h-screen pt-20 pb-12 px-4"
        style={{ background: 'linear-gradient(135deg,#f0f4ff 0%,#faf0ff 50%,#f0fff4 100%)' }}>
        <div className="max-w-[900px] mx-auto">

          {/* Header */}
          <div className="mb-6 px-7 py-6 rounded-2xl text-white shadow-[0_8px_25px_rgba(102,126,234,0.4)]"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold m-0 mb-1">🔖 Saved Jobs</h1>
                <p className="text-white/70 text-sm m-0">
                  {displayed.length} job{displayed.length !== 1 ? 's' : ''} saved · ready to apply
                </p>
              </div>
              <button
                className="px-5 py-2.5 bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/30 cursor-pointer hover:bg-white/30 transition-all"
                onClick={() => navigate('/jobs')}>
                ← Browse More Jobs
              </button>
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div className="mb-4 px-5 py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 shadow-md text-gray-700">
              {toast}
            </div>
          )}

          {/* Controls */}
          {normalised.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-5 items-center">
              <div className="flex gap-2">
                {[
                  { id: 'match',   label: '🎯 Best Match' },
                  { id: 'date',    label: '🕐 Newest First' },
                  { id: 'company', label: '🏢 Company A-Z' },
                ].map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 cursor-pointer transition-all ${sortBy === s.id ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                    style={sortBy === s.id ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {}}>
                    {s.label}
                  </button>
                ))}
              </div>
              {domains.length > 0 && (
                <select value={filterDomain} onChange={e => setFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border-2 border-gray-200 rounded-xl bg-white text-gray-600 outline-none cursor-pointer focus:border-indigo-400 ml-auto">
                  <option value="">All Domains</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-3">
              <div className="w-9 h-9 border-[3px] border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
              Loading saved jobs…
            </div>
          )}

          {/* Empty state */}
          {!loading && displayed.length === 0 && (
            <div className="text-center py-20 flex flex-col items-center gap-5">
              <div className="text-7xl">🔖</div>
              <h2 className="text-2xl font-bold text-gray-700 m-0">
                {filterDomain ? 'No saved jobs in this domain' : 'No saved jobs yet'}
              </h2>
              <p className="text-gray-500 m-0 max-w-sm">
                {filterDomain
                  ? 'Try removing the domain filter to see all saved jobs.'
                  : 'Swipe right on a job to save it here. You can apply when you\'re ready.'}
              </p>
              <div className="flex gap-3">
                {filterDomain && (
                  <button className="px-6 py-3 text-sm font-semibold text-indigo-600 border-2 border-indigo-200 rounded-xl bg-white cursor-pointer hover:bg-indigo-50"
                    onClick={() => setFilter('')}>Clear Filter</button>
                )}
                <button className="px-6 py-3 text-white text-sm font-bold rounded-xl border-none cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                  onClick={() => navigate('/jobs')}>Browse Jobs</button>
              </div>
            </div>
          )}

          {/* Saved job cards */}
          {!loading && displayed.length > 0 && (
            <div className="flex flex-col gap-3">
              {displayed.map(m => {
                const job    = m.job;
                const mc     = m.matchScore ? matchColor(m.matchScore) : null;
                const badge  = getJobBadge(job);
                const bs     = badge ? BADGE_STYLES[badge.color] : null;
                const wm     = WORK_MODE_COLORS[job.workMode] || null;
                const srcClr = SOURCE_COLORS[job.source] || '#764ba2';

                return (
                  <div key={m.id}
                    className="bg-white rounded-2xl px-5 py-5 shadow-[0_4px_15px_rgba(0,0,0,0.07)] border border-gray-200 transition-all hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">

                    {/* Top row */}
                    <div className="flex items-start gap-3 mb-3">
                      {/* Company initial */}
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.15)]"
                        style={{ background: `linear-gradient(135deg,${srcClr},#764ba2)` }}>
                        {(job.company || '?').charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title + badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h3 className="text-base font-bold text-gray-900 m-0">{job.title}</h3>
                          {badge && bs && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border"
                              style={{ background: bs.bg, color: bs.text, borderColor: bs.border }}>
                              🆕 {badge.label}
                            </span>
                          )}
                          {wm && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ background: wm.bg, color: wm.text }}>{job.workMode}</span>
                          )}
                          {job.source && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                              style={{ background: srcClr }}>via {job.source}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 m-0">{job.company} · {job.location}</p>
                      </div>

                      {/* Match score */}
                      {mc && m.matchScore > 0 && (
                        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold border"
                          style={{ background: mc.bg, color: mc.text, borderColor: mc.border }}>
                          🎯 {m.matchScore}%
                        </span>
                      )}
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-600">
                      {job.salary && <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">💰 {job.salary}</span>}
                      {(job.experienceRequired || job.experience) && (
                        <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">🧑‍💼 {job.experienceRequired || job.experience}</span>
                      )}
                      {job.jobType && <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">⏰ {job.jobType}</span>}
                      {job.domain && <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-100">🎯 {job.domain}</span>}
                      {job.deadline && (
                        <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg border border-red-100">
                          ⏰ Deadline: {new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {/* Skills */}
                    {(job.skillsRequired?.length > 0 || job.requirements?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(job.skillsRequired?.length > 0 ? job.skillsRequired : job.requirements).slice(0, 6).map((s, i) => {
                          const matched = m.matchDetails?.matchedSkills?.includes(s);
                          return (
                            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                              style={matched
                                ? { background: '#c6f6d5', color: '#22543d', borderColor: '#9ae6b4' }
                                : { background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}>
                              {matched && '✓ '}{s}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Why match summary */}
                    {m.matchDetails && m.matchScore > 0 && (
                      <div className="mb-3 px-3 py-2 rounded-lg text-xs"
                        style={{ background: mc?.bg || '#f0f4ff', color: mc?.text || '#3730a3' }}>
                        💡 {m.matchDetails.matchedSkills?.length > 0
                          ? `Skills matched: ${m.matchDetails.matchedSkills.slice(0, 3).join(', ')}${m.matchDetails.matchedSkills.length > 3 ? '…' : ''}`
                          : 'Profile match'
                        }
                        {m.matchDetails.matchedDomain && ' · Domain ✓'}
                        {m.matchDetails.matchedLocation && ' · Location ✓'}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-[11px] text-gray-400">Saved {timeAgo(m.matchedAt)}</span>
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-1.5 text-xs font-bold text-white border-none rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 shadow-[0_3px_10px_rgba(102,126,234,0.4)]"
                          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                          onClick={() => handleMarkApplied(m.id)}>
                          🚀 Mark Applied
                        </button>
                        <button
                          className="px-4 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100 transition-all"
                          onClick={() => handleUnsave(m.id)}>
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary stats */}
          {!loading && normalised.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Saved',     value: normalised.length,                                          color: '#667eea' },
                { label: 'High Match',value: normalised.filter(m => m.matchScore >= 70).length,          color: '#38a169' },
                { label: 'Expiring',  value: normalised.filter(m => {
                    if (!m.job.deadline) return false;
                    const diff = new Date(m.job.deadline) - Date.now();
                    return diff > 0 && diff < 7 * 24 * 3600_000;
                  }).length, color: '#e53e3e' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-500 font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
