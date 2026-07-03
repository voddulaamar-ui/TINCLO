// JobBrowser — Live jobs, match scoring, full filters, auto-refresh, WebSocket push

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { JobCard } from './JobCard';
import ApiService from '../services/ApiService';
import SocketService from '../services/SocketService';
import { MOCK_JOBS } from '../data/mockJobs';
import { trackJobView } from './AnalyticsPage';
import { sortNewest, filterByTime, recordVisit, getLastVisit, isNewSinceLastVisit } from '../hooks/useJobAge';
import { scoreJobs, sortByMatchThenDate } from '../services/MatchingService';

const AUTO_REFRESH_MS = 5 * 60 * 1000;

const TIME_FILTERS = [
  { id: 'all',    label: '🌐 All' },
  { id: 'newest', label: '✨ 72h' },
  { id: 'today',  label: '⚡ Today' },
  { id: 'week',   label: '📅 Week' },
];

const DOMAINS    = ['', 'Full Stack', 'Frontend', 'Backend', 'Data Science', 'Machine Learning', 'DevOps', 'Cloud', 'Mobile', 'UI/UX Design', 'Product Management', 'Cybersecurity', 'Blockchain', 'QA / Testing'];
const WORK_MODES = ['', 'Remote', 'Hybrid', 'Onsite'];
const JOB_TYPES  = ['', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

const selCls = 'px-3 py-2 text-xs font-semibold bg-white/20 text-white border border-white/30 rounded-xl outline-none cursor-pointer focus:border-white/70 backdrop-blur-sm';
const txtCls = 'px-3 py-2 text-xs font-semibold bg-white/20 text-white border border-white/30 rounded-xl outline-none placeholder:text-white/50 focus:border-white/70 backdrop-blur-sm min-w-0';

// ── Skipped-job persistence helpers ──────────────────────────────────────────
const SKIPPED_KEY = 'tinclo_skipped_jobs';

function loadSkipped(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(SKIPPED_KEY) || '{}');
    return new Set(all[userId] || []);
  } catch { return new Set(); }
}

function saveSkipped(userId, set) {
  try {
    const all = JSON.parse(localStorage.getItem(SKIPPED_KEY) || '{}');
    all[userId] = Array.from(set).slice(-500); // cap at 500 skipped ids
    localStorage.setItem(SKIPPED_KEY, JSON.stringify(all));
  } catch { /* quota */ }
}

function clearSkipped(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(SKIPPED_KEY) || '{}');
    delete all[userId];
    localStorage.setItem(SKIPPED_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// ── New-jobs banner ───────────────────────────────────────────────────────────
const NewJobsBanner = ({ count, onLoad, onDismiss }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg"
    style={{ background: 'linear-gradient(135deg,#48bb78,#38a169)' }}>
    <span>🆕 {count} new job{count !== 1 ? 's' : ''} available!</span>
    <div className="flex gap-2">
      <button className="px-3 py-1 bg-white/25 text-white rounded-xl text-xs font-bold border-none cursor-pointer hover:bg-white/35" onClick={onLoad}>Load now</button>
      <button className="px-2 py-1 bg-transparent text-white/70 rounded-xl text-xs border-none cursor-pointer hover:text-white" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const JobBrowser = ({ onMatch, onSkip, onNavigateToMatches, currentUser, likedJobIds = [] }) => {
  const [allJobs, setAllJobs]             = useState([]);
  const [jobs, setJobs]                   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [jobIndex, setJobIndex]           = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);

  // ── Primary search ────────────────────────────────────────────────────────
  const [search, setSearch]       = useState('');
  const [searchLoc, setSearchLoc] = useState('India');

  // ── Advanced filters ──────────────────────────────────────────────────────
  const [showFilters, setShowFilters]       = useState(false);
  const [timeFilter, setTimeFilter]         = useState('all');
  const [filterDomain, setFilterDomain]     = useState('');
  const [filterWorkMode, setFilterWorkMode] = useState('');
  const [filterJobType, setFilterJobType]   = useState('');
  const [filterCompany, setFilterCompany]   = useState('');
  const [filterSkill, setFilterSkill]       = useState('');
  const [filterSalary, setFilterSalary]     = useState(''); // e.g. "10" = min 10L

  // ── Real-time ─────────────────────────────────────────────────────────────
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingJobs, setPendingJobs]   = useState(null);
  const [lastVisit, setLastVisit]       = useState(getLastVisit);
  const [refreshedAt, setRefreshedAt]   = useState(null);
  const [refreshLabel, setRefreshLabel] = useState('');

  const refreshRef = useRef(null);
  const labelRef   = useRef(null);

  // ── User profile for scoring ──────────────────────────────────────────────
  const userProfile = currentUser
    ? (() => { try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; } })()
    : null;

  // ── Skipped jobs — persisted per user ────────────────────────────────────
  const userId = currentUser?.id || 'guest';
  const [skippedIds, setSkippedIds] = useState(() => loadSkipped(currentUser?.id || 'guest'));

  // ── Check whether any advanced filter is active ───────────────────────────
  const hasAdvancedFilter = filterDomain || filterWorkMode || filterJobType || filterCompany || filterSkill || filterSalary;

  // ── Apply all filters + scoring ───────────────────────────────────────────
  const applyAll = useCallback((raw, tFilter, fDomain, fWorkMode, fJobType, fCompany, fSkill, fSalary) => {
    let result = sortNewest(raw);
    result = filterByTime(result, tFilter);
    if (fDomain)   result = result.filter(j => (j.domain || '').toLowerCase().includes(fDomain.toLowerCase()));
    if (fWorkMode) result = result.filter(j => j.workMode === fWorkMode);
    if (fJobType)  result = result.filter(j => (j.jobType || '').toLowerCase().includes(fJobType.toLowerCase()));
    if (fCompany)  result = result.filter(j => (j.company || '').toLowerCase().includes(fCompany.toLowerCase()));
    if (fSkill)    result = result.filter(j => {
      const q = fSkill.toLowerCase();
      return (j.title || '').toLowerCase().includes(q)
        || (j.skillsRequired || []).some(s => s.toLowerCase().includes(q))
        || (j.requirements   || []).some(s => s.toLowerCase().includes(q))
        || (j.tags           || []).some(t => t.toLowerCase().includes(q))
        || (j.description    || '').toLowerCase().includes(q);
    });
    // Salary filter — match jobs whose salary string contains the keyword (e.g. "10L", "remote", "50000")
    if (fSalary) {
      const sq = fSalary.toLowerCase().trim();
      result = result.filter(j => (j.salary || '').toLowerCase().includes(sq));
    }
    const scored = scoreJobs(result, userProfile);
    return sortByMatchThenDate(scored);
  }, [userProfile]);

  const clearAllFilters = () => {
    setFilterDomain(''); setFilterWorkMode(''); setFilterJobType('');
    setFilterCompany(''); setFilterSkill(''); setFilterSalary(''); setTimeFilter('all');
    setJobIndex(0);
  };

  // ── Merge incoming jobs (dedup by id) ─────────────────────────────────────
  const mergeJobs = useCallback((incoming) => {
    setAllJobs(prev => {
      const map = new Map(prev.map(j => [String(j._id || j.id), j]));
      incoming.forEach(j => map.set(String(j._id || j.id), j));
      return Array.from(map.values());
    });
  }, []);

  const commitPending = useCallback(() => {
    if (!pendingJobs) return;
    mergeJobs(pendingJobs);
    setPendingCount(0); setPendingJobs(null); setJobIndex(0);
  }, [pendingJobs, mergeJobs]);

  // ── Core load ─────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async (query, location, silent = false) => {
    if (!silent) setLoading(true);
    setUsingFallback(false);
    try {
      const result = await ApiService.fetchExternalJobs({ query: query || 'software developer', location: location || 'India' });
      const fetched = result.jobs || result;
      if (!fetched.length) throw new Error('No jobs');
      mergeJobs(fetched);
      setRefreshedAt(new Date());
      if (!silent) setJobIndex(0);
    } catch (err) {
      console.warn('Fallback to mock:', err.message);
      const q = (query || '').toLowerCase();
      const filtered = q && q !== 'software developer'
        ? MOCK_JOBS.filter(j => j.title.toLowerCase().includes(q) || (j.tags || []).some(t => t.toLowerCase().includes(q)))
        : MOCK_JOBS;
      mergeJobs(filtered.length ? filtered : MOCK_JOBS);
      setUsingFallback(true);
      if (!silent) setJobIndex(0);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [mergeJobs]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      setUsingFallback(false);
      const prev = getLastVisit();
      setLastVisit(prev);
      recordVisit();
      try {
        const results = await Promise.all([
          ApiService.fetchExternalJobs({ query: 'software developer', location: 'India' }),
          ApiService.fetchExternalJobs({ query: 'data scientist',     location: 'India' }),
          ApiService.fetchExternalJobs({ query: 'product manager',    location: 'India' }),
        ]);
        const seen = new Set(); const merged = [];
        for (const r of results) {
          for (const j of (r.jobs || r || [])) {
            const id = String(j._id || j.id);
            if (!seen.has(id)) { seen.add(id); merged.push(j); }
          }
        }
        if (!merged.length) throw new Error('empty');
        mergeJobs(merged); setRefreshedAt(new Date()); setJobIndex(0);
      } catch {
        mergeJobs(MOCK_JOBS); setUsingFallback(true); setJobIndex(0);
      } finally { setLoading(false); }
    };
    boot();
  }, []); // eslint-disable-line

  // ── Auto-refresh every 5 min ──────────────────────────────────────────────
  useEffect(() => {
    refreshRef.current = setInterval(() =>
      loadJobs(search || 'software developer', searchLoc || 'India', true), AUTO_REFRESH_MS);
    return () => clearInterval(refreshRef.current);
  }, [loadJobs, search, searchLoc]);

  // ── "Updated X ago" label ─────────────────────────────────────────────────
  useEffect(() => {
    const upd = () => {
      if (!refreshedAt) return;
      const s = Math.floor((Date.now() - refreshedAt.getTime()) / 1000);
      setRefreshLabel(s < 10 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`);
    };
    upd();
    labelRef.current = setInterval(upd, 30_000);
    return () => clearInterval(labelRef.current);
  }, [refreshedAt]);

  // ── WebSocket: new-job push ───────────────────────────────────────────────
  useEffect(() => {
    const socket = SocketService.getSocket();
    if (!socket) return;
    SocketService.onNewJobs((payload) => {
      const incoming = payload.jobs || [];
      if (!incoming.length) return;
      setAllJobs(prev => {
        const existing = new Set(prev.map(j => String(j._id || j.id)));
        const brandNew = incoming.filter(j => !existing.has(String(j._id || j.id)));
        if (brandNew.length > 0) { setPendingCount(brandNew.length); setPendingJobs(incoming); return prev; }
        const map = new Map(prev.map(j => [String(j._id || j.id), j]));
        incoming.forEach(j => map.set(String(j._id || j.id), j));
        setRefreshedAt(new Date());
        return Array.from(map.values());
      });
    });
    return () => SocketService.offNewJobs();
  }, []); // eslint-disable-line

  // ── Re-apply filters + scoring whenever inputs change ─────────────────────
  useEffect(() => {
    setJobs(applyAll(allJobs, timeFilter, filterDomain, filterWorkMode, filterJobType, filterCompany, filterSkill, filterSalary));
  }, [allJobs, timeFilter, filterDomain, filterWorkMode, filterJobType, filterCompany, filterSkill, filterSalary, applyAll]);

  // ── Skip already-liked OR already-skipped jobs ───────────────────────────
  const nextUnliked = (start, list) => {
    let i = start;
    while (i < list.length) {
      const id = String(list[i]._id || list[i].id);
      if (!likedJobIds.includes(id) && !skippedIds.has(id)) break;
      i++;
    }
    return i;
  };

  const effectiveIndex = nextUnliked(jobIndex, jobs);
  const currentJob     = jobs[effectiveIndex];
  const isComplete     = !loading && effectiveIndex >= jobs.length;
  const newSinceCount  = lastVisit ? allJobs.filter(j => isNewSinceLastVisit(j, lastVisit)).length : 0;

  // ── Track job view ────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentJob) {
      const id = currentJob._id || currentJob.id;
      trackJobView(id);
      if (currentUser?.id && id) ApiService.trackJobView({ userId: currentUser.id, jobId: id }).catch(() => {});
    }
  }, [currentJob?._id, currentJob?.id]); // eslint-disable-line

  const handleSearch = (e) => { e.preventDefault(); loadJobs(search || 'software developer', searchLoc || 'India'); };
  const handleLike   = () => { if (currentJob) { onMatch(currentJob); setJobIndex(nextUnliked(effectiveIndex + 1, jobs)); } };
  const handleSkip   = () => {
    if (currentJob) {
      const id = String(currentJob._id || currentJob.id);
      const next = new Set(skippedIds);
      next.add(id);
      setSkippedIds(next);
      saveSkipped(userId, next);
    }
    onSkip();
    setJobIndex(nextUnliked(effectiveIndex + 1, jobs));
  };
  const handleResetSwipes = () => {
    clearSkipped(userId);
    setSkippedIds(new Set());
    setJobIndex(0);
  };

  // Filter counts for time-filter pills
  const fc = {
    all:    allJobs.length,
    newest: filterByTime(allJobs, 'newest').length,
    today:  filterByTime(allJobs, 'today').length,
    week:   filterByTime(allJobs, 'week').length,
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full max-w-[860px] mx-auto flex flex-col min-h-0 gap-2">

      {/* ── Search + filter bar ── */}
      <div className="rounded-3xl p-4 text-white shrink-0"
        style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', boxShadow: '0 8px 30px rgba(102,126,234,0.4)' }}>

        {/* Primary search row */}
        <form className="mb-3" onSubmit={handleSearch}>
          <div className="flex gap-2.5 flex-wrap">
            <div className="flex-[1.35_1_280px] min-w-[260px] flex items-center bg-white/20 border-2 border-white/30 rounded-2xl px-4 gap-2.5 backdrop-blur-md transition-all focus-within:border-white/70">
              <span className="shrink-0">🔍</span>
              <input type="text"
                className="w-full min-w-0 border-none bg-transparent py-3 text-sm text-white outline-none font-medium placeholder:text-white/70"
                placeholder="Job title, skills…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex-[1_1_200px] min-w-[180px] flex items-center bg-white/20 border-2 border-white/30 rounded-2xl px-4 gap-2.5 backdrop-blur-md transition-all focus-within:border-white/70">
              <span className="shrink-0">📍</span>
              <input type="text"
                className="w-full min-w-0 border-none bg-transparent py-3 text-sm text-white outline-none font-medium placeholder:text-white/70"
                placeholder="Location"
                value={searchLoc} onChange={e => setSearchLoc(e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
              className="py-3 px-5 bg-white text-indigo-600 text-sm font-extrabold border-none rounded-2xl cursor-pointer whitespace-nowrap transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 disabled:opacity-70">
              {loading ? '⏳' : '🚀 Search'}
            </button>
            <button type="button"
              className={`py-3 px-4 text-white text-sm font-bold border rounded-2xl cursor-pointer transition-all ${hasAdvancedFilter ? 'bg-amber-400/40 border-amber-300' : 'bg-white/20 border-white/30 hover:bg-white/30'}`}
              onClick={() => setShowFilters(v => !v)}>
              {showFilters ? '✕ Filters' : `⚙️ Filters${hasAdvancedFilter ? ' •' : ''}`}
            </button>
          </div>
        </form>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="pt-3 pb-1 border-t border-white/20 mb-3">
            <div className="flex gap-2 flex-wrap mb-2">
              {/* Domain */}
              <select value={filterDomain} onChange={e => { setFilterDomain(e.target.value); setJobIndex(0); }} className={selCls}>
                <option value="">All Domains</option>
                {DOMAINS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* Work Mode */}
              <select value={filterWorkMode} onChange={e => { setFilterWorkMode(e.target.value); setJobIndex(0); }} className={selCls}>
                <option value="">Any Work Mode</option>
                {WORK_MODES.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              {/* Job Type */}
              <select value={filterJobType} onChange={e => { setFilterJobType(e.target.value); setJobIndex(0); }} className={selCls}>
                <option value="">Any Job Type</option>
                {JOB_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Company */}
              <input
                type="text"
                className={txtCls}
                style={{ width: '130px' }}
                placeholder="🏢 Company…"
                value={filterCompany}
                onChange={e => { setFilterCompany(e.target.value); setJobIndex(0); }}
              />

              {/* Skill / keyword */}
              <input
                type="text"
                className={txtCls}
                style={{ width: '130px' }}
                placeholder="🛠 Skill / keyword…"
                value={filterSkill}
                onChange={e => { setFilterSkill(e.target.value); setJobIndex(0); }}
              />

              {/* Salary keyword */}
              <input
                type="text"
                className={txtCls}
                style={{ width: '120px' }}
                placeholder="💰 Salary…"
                value={filterSalary}
                onChange={e => { setFilterSalary(e.target.value); setJobIndex(0); }}
                title="e.g. 10L, 50000, Remote"
              />

              {/* Clear button — only shown when a filter is active */}
              {hasAdvancedFilter && (
                <button type="button"
                  className="px-3 py-2 text-xs font-bold bg-red-400/25 text-white border border-red-300/40 rounded-xl cursor-pointer hover:bg-red-400/40 transition-all"
                  onClick={clearAllFilters}>
                  ✕ Clear all
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {hasAdvancedFilter && (
              <div className="flex gap-1.5 flex-wrap">
                {filterDomain   && <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">🎯 {filterDomain}</span>}
                {filterWorkMode && <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">🏠 {filterWorkMode}</span>}
                {filterJobType  && <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">⏰ {filterJobType}</span>}
                {filterCompany  && <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">🏢 {filterCompany}</span>}
                {filterSkill    && <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">🛠 {filterSkill}</span>}
                {filterSalary   && <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">💰 {filterSalary}</span>}
                <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-[10px] text-white/60">→ {jobs.length} results</span>
              </div>
            )}
          </div>
        )}

        {/* Time filter pills */}
        <div className="flex gap-2 flex-wrap mb-2.5">
          {TIME_FILTERS.map(({ id, label }) => (
            <button key={id} onClick={() => { setTimeFilter(id); setJobIndex(0); }}
              className={`px-3 py-1 rounded-full text-xs font-bold border-2 cursor-pointer transition-all ${timeFilter === id ? 'text-white border-white/60 bg-white/25' : 'bg-white/15 text-white border-white/25 hover:bg-white/25'}`}>
              {label} <span className="opacity-70">({fc[id]})</span>
            </button>
          ))}
        </div>

        {/* Source pills + refresh status */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {[['#ff6b35','Naukri'],['#0077b5','LinkedIn'],['#2164f3','Indeed'],['#0caa41','Glassdoor'],['#38a169','Recruiter']].map(([bg, label]) => (
            <span key={label} className="text-white font-bold py-[3px] px-2.5 rounded-xl" style={{ background: bg }}>{label}</span>
          ))}
          {refreshLabel && (
            <span className="ml-auto flex items-center gap-1.5 text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Updated {refreshLabel}
              <button className="px-2 py-0.5 bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold rounded-lg border-none cursor-pointer"
                onClick={() => loadJobs(search || 'software developer', searchLoc || 'India')}>↻</button>
            </span>
          )}
        </div>

        {newSinceCount > 0 && (
          <div className="mt-2 text-[11px] text-amber-300 font-bold">⭐ {newSinceCount} new since your last visit</div>
        )}
        {skippedIds.size > 0 && (
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/50">
            <span>🙈 {skippedIds.size} skipped job{skippedIds.size !== 1 ? 's' : ''}</span>
            <button
              type="button"
              className="underline cursor-pointer bg-transparent border-none text-white/60 hover:text-white text-[11px] p-0"
              onClick={handleResetSwipes}>
              Reset
            </button>
          </div>
        )}
        {usingFallback && (
          <div className="mt-2 px-3 py-1.5 bg-white/15 rounded-[10px] text-xs text-white/80">
            📋 Showing {allJobs.length} curated jobs · Start backend for live jobs
          </div>
        )}
      </div>

      {/* Pending new-jobs banner */}
      {pendingCount > 0 && (
        <NewJobsBanner
          count={pendingCount}
          onLoad={() => { commitPending(); setJobIndex(0); }}
          onDismiss={() => { setPendingCount(0); setPendingJobs(null); }}
        />
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500 text-[15px]">
          <div className="w-9 h-9 border-[3px] border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p>Fetching latest jobs…</p>
        </div>
      )}

      {/* Empty filter result */}
      {!loading && !isComplete && jobs.length === 0 && allJobs.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center px-5">
          <div className="text-5xl">🔍</div>
          <h3 className="text-lg font-bold text-gray-700 m-0">No jobs match these filters</h3>
          <p className="text-sm text-gray-400 m-0">Try adjusting or clearing filters to see more results.</p>
          <button className="mt-2 px-6 py-2.5 text-white font-semibold rounded-xl border-none cursor-pointer text-sm"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
            onClick={clearAllFilters}>
            Clear All Filters
          </button>
        </div>
      )}

      {/* All done */}
      {!loading && isComplete && (
        <div className="flex items-center justify-center min-h-[400px] p-5">
          <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.1)] p-12 text-center max-w-[500px]">
            <h2 className="text-[30px] font-bold mt-0 mb-2 text-gray-800">🎉 All Done!</h2>
            <p className="text-gray-500 mt-0 mb-2">You've reviewed all {jobs.length} job postings.</p>
            {skippedIds.size > 0 && (
              <p className="text-sm text-amber-600 font-semibold mb-6 m-0">
                🙈 {skippedIds.size} job{skippedIds.size !== 1 ? 's' : ''} skipped (hidden from feed)
              </p>
            )}
            <div className="flex gap-3 justify-center flex-wrap mt-6">
              <button
                className="text-white py-3.5 px-8 text-sm font-semibold border-none rounded-xl cursor-pointer transition-all shadow-[0_4px_12px_rgba(102,126,234,0.35)] hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                onClick={onNavigateToMatches}>
                View Matches
              </button>
              <button
                className="bg-white text-indigo-500 py-3.5 px-8 text-sm font-semibold border-2 border-indigo-500 rounded-xl cursor-pointer hover:bg-indigo-50"
                onClick={() => { mergeJobs(MOCK_JOBS); setJobIndex(0); setUsingFallback(true); }}>
                🔄 Browse Again
              </button>
              {skippedIds.size > 0 && (
                <button
                  className="bg-amber-50 text-amber-700 py-3.5 px-8 text-sm font-semibold border-2 border-amber-300 rounded-xl cursor-pointer hover:bg-amber-100 transition-all"
                  onClick={handleResetSwipes}
                  title="Clear skipped history and see all jobs again including skipped ones">
                  ↺ Reset Skipped ({skippedIds.size})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job card */}
      {!loading && !isComplete && currentJob && (
        <>
          <div className="text-center text-sm text-gray-500 mb-1 flex items-center justify-center gap-2 shrink-0 flex-wrap">
            <span>Job {effectiveIndex + 1} of {jobs.length}</span>
            {!usingFallback && <span className="text-xs bg-green-50 text-green-700 py-0.5 px-2.5 rounded-xl font-semibold">🟢 Live</span>}
            {currentJob.matchScore > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-xl" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                🎯 {currentJob.matchScore}% match
              </span>
            )}
            {newSinceCount > 0 && (
              <span className="text-xs bg-amber-50 text-amber-700 py-0.5 px-2.5 rounded-xl font-semibold">
                🕐 {newSinceCount} new since last visit
              </span>
            )}
            {skippedIds.size > 0 && (
              <button
                className="text-xs bg-gray-100 text-gray-500 py-0.5 px-2.5 rounded-xl font-semibold border-none cursor-pointer hover:bg-amber-50 hover:text-amber-700 transition-colors"
                onClick={handleResetSwipes}
                title="Reset skipped jobs to see them again">
                🙈 {skippedIds.size} skipped · reset
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 flex items-start justify-center overflow-hidden">
            <JobCard
              job={currentJob}
              onLike={handleLike}
              onDislike={handleSkip}
              currentUser={currentUser}
              isNewSinceVisit={isNewSinceLastVisit(currentJob, lastVisit)}
            />
          </div>
        </>
      )}
    </div>
  );
};
