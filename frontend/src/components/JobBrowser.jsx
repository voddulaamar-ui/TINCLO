// JobBrowser Component — Live jobs from Naukri, LinkedIn, Indeed, Glassdoor
// Features: real-time WebSocket refresh, auto-refresh, filters, new badges, last-visit tracking

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { JobCard } from './JobCard';
import ApiService from '../services/ApiService';
import SocketService from '../services/SocketService';
import { MOCK_JOBS } from '../data/mockJobs';
import { trackJobView } from './AnalyticsPage';
import {
  sortNewest,
  filterByTime,
  recordVisit,
  getLastVisit,
  isNewSinceLastVisit,
  getJobBadge,
  timeAgo,
} from '../hooks/useJobAge';

const DEFAULT_SEARCHES = [
  { query: 'software developer', location: 'India' },
  { query: 'data scientist',     location: 'India' },
  { query: 'product manager',    location: 'India' },
];

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

const FILTER_OPTIONS = [
  { id: 'all',    label: '🌐 All Jobs' },
  { id: 'newest', label: '✨ New (72h)' },
  { id: 'today',  label: '⚡ Today' },
  { id: 'week',   label: '📅 This Week' },
];

// ── New-jobs toast banner ─────────────────────────────────────────────────────
const NewJobsBanner = ({ count, onRefresh, onDismiss }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg animate-slide-down"
    style={{ background: 'linear-gradient(135deg, #48bb78, #38a169)' }}>
    <span>🆕 {count} new job{count !== 1 ? 's' : ''} available!</span>
    <div className="flex gap-2">
      <button
        className="px-3 py-1 bg-white/25 text-white rounded-xl text-xs font-bold border-none cursor-pointer hover:bg-white/35 transition-colors"
        onClick={onRefresh}
      >
        Load now
      </button>
      <button
        className="px-2 py-1 bg-transparent text-white/70 rounded-xl text-xs border-none cursor-pointer hover:text-white transition-colors"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  </div>
);

// ── Filter bar ────────────────────────────────────────────────────────────────
const FilterBar = ({ active, onChange, counts }) => (
  <div className="flex gap-2 flex-wrap">
    {FILTER_OPTIONS.map(({ id, label }) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        className={[
          'px-3.5 py-1.5 rounded-full text-xs font-bold border-2 cursor-pointer transition-all whitespace-nowrap',
          active === id
            ? 'text-white border-transparent shadow-[0_3px_10px_rgba(102,126,234,0.45)]'
            : 'bg-white/20 text-white border-white/30 hover:bg-white/30 hover:border-white/50',
        ].join(' ')}
        style={active === id ? { background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.6)' } : {}}
      >
        {label}
        {counts[id] !== undefined && (
          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${active === id ? 'bg-white/30 text-white' : 'bg-white/20 text-white/80'}`}>
            {counts[id]}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ── Last-visit indicator ──────────────────────────────────────────────────────
const NewSinceVisitBadge = ({ count }) => {
  if (!count) return null;
  return (
    <span className="ml-2 px-2.5 py-1 bg-amber-400 text-amber-900 text-[11px] font-extrabold rounded-full animate-pulse">
      {count} new since your last visit
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const JobBrowser = ({ onMatch, onSkip, onNavigateToMatches, currentUser, likedJobIds = [] }) => {
  const [allJobs, setAllJobs]           = useState([]);   // raw unfiltered list
  const [jobs, setJobs]                 = useState([]);   // after filter + sort
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchLocation, setSearchLocation] = useState('India');
  const [jobIndex, setJobIndex]         = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [timeFilter, setTimeFilter]     = useState('all');
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const [pendingJobs, setPendingJobs]   = useState(null);   // queued socket payload
  const [lastVisit, setLastVisit]       = useState(getLastVisit);
  const [refreshedAt, setRefreshedAt]   = useState(null);
  const [lastRefreshLabel, setLastRefreshLabel] = useState('');

  const refreshTimerRef = useRef(null);
  const labelTimerRef   = useRef(null);

  // ── Utility: build jobs from raw list + current filter ──────────────────────
  const applyFilter = useCallback((rawJobs, filter) => {
    const sorted   = sortNewest(rawJobs);
    const filtered = filterByTime(sorted, filter);
    return filtered;
  }, []);

  // ── Compute filter counts ────────────────────────────────────────────────────
  const filterCounts = {
    all:    allJobs.length,
    newest: filterByTime(allJobs, 'newest').length,
    today:  filterByTime(allJobs, 'today').length,
    week:   filterByTime(allJobs, 'week').length,
  };

  // ── Count new-since-last-visit ───────────────────────────────────────────────
  const newSinceLastVisitCount = lastVisit
    ? allJobs.filter(j => isNewSinceLastVisit(j, lastVisit)).length
    : 0;

  // ── Merge incoming jobs into allJobs, dedup by _id ──────────────────────────
  const mergeJobs = useCallback((incoming) => {
    setAllJobs(prev => {
      const map = new Map(prev.map(j => [String(j._id || j.id), j]));
      incoming.forEach(j => map.set(String(j._id || j.id), j));
      return Array.from(map.values());
    });
  }, []);

  // ── Commit the pending snapshot (user clicked "Load now") ───────────────────
  const commitPending = useCallback(() => {
    if (!pendingJobs) return;
    mergeJobs(pendingJobs);
    setPendingNewCount(0);
    setPendingJobs(null);
    setJobIndex(0);
  }, [pendingJobs, mergeJobs]);

  // ── Core load function ───────────────────────────────────────────────────────
  const loadJobs = useCallback(async (query, location, silent = false) => {
    if (!silent) setLoading(true);
    setUsingFallback(false);
    try {
      const result = await ApiService.fetchExternalJobs({ query: query || 'software developer', location: location || 'India' });
      const fetched = result.jobs || [];
      if (fetched.length === 0) throw new Error('No jobs returned');
      mergeJobs(fetched);
      setRefreshedAt(new Date());
      if (!silent) setJobIndex(0);
    } catch (err) {
      console.warn('Backend unavailable, using mock jobs:', err.message);
      const q = (query || '').toLowerCase();
      const filtered = q && q !== 'software developer'
        ? MOCK_JOBS.filter(j =>
            j.title.toLowerCase().includes(q) ||
            (j.tags || []).some(t => t.toLowerCase().includes(q)) ||
            j.company.toLowerCase().includes(q)
          )
        : MOCK_JOBS;
      mergeJobs(filtered.length > 0 ? filtered : MOCK_JOBS);
      setUsingFallback(true);
      if (!silent) setJobIndex(0);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [mergeJobs]);

  // ── Initial load (parallel search) ──────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setUsingFallback(false);

      // Record this visit BEFORE loading so we can later detect what's newer
      const prevVisit = getLastVisit();
      setLastVisit(prevVisit);
      recordVisit();

      try {
        const results = await Promise.all(
          DEFAULT_SEARCHES.map(s => ApiService.fetchExternalJobs(s))
        );
        const seen   = new Set();
        const merged = [];
        for (const r of results) {
          for (const job of (r.jobs || [])) {
            const id = String(job._id || job.id);
            if (!seen.has(id)) { seen.add(id); merged.push(job); }
          }
        }
        if (merged.length === 0) throw new Error('No jobs from backend');
        mergeJobs(merged);
        setRefreshedAt(new Date());
        setJobIndex(0);
      } catch (err) {
        console.warn('Backend unavailable, loading all mock jobs:', err.message);
        mergeJobs(MOCK_JOBS);
        setJobIndex(0);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh every 5 minutes ────────────────────────────────────────────
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      loadJobs(searchQuery || 'software developer', searchLocation || 'India', true);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(refreshTimerRef.current);
  }, [loadJobs, searchQuery, searchLocation]);

  // ── "Last refreshed X ago" label — updates every 30 s ──────────────────────
  useEffect(() => {
    const update = () => {
      if (!refreshedAt) return;
      const diffS = Math.floor((Date.now() - refreshedAt.getTime()) / 1000);
      if (diffS < 10)       setLastRefreshLabel('just now');
      else if (diffS < 60)  setLastRefreshLabel(`${diffS}s ago`);
      else                  setLastRefreshLabel(`${Math.floor(diffS / 60)}m ago`);
    };
    update();
    labelTimerRef.current = setInterval(update, 30_000);
    return () => clearInterval(labelTimerRef.current);
  }, [refreshedAt]);

  // ── WebSocket: listen for jobs:new push ─────────────────────────────────────
  useEffect(() => {
    const socket = SocketService.getSocket();
    if (!socket) return;

    SocketService.onNewJobs((payload) => {
      const incoming = payload.jobs || [];
      if (!incoming.length) return;

      // Identify truly new IDs vs what we already have
      setAllJobs(prev => {
        const existingIds = new Set(prev.map(j => String(j._id || j.id)));
        const brandNew    = incoming.filter(j => !existingIds.has(String(j._id || j.id)));
        if (brandNew.length > 0) {
          // Don't inject immediately — show a banner so the user can decide
          setPendingNewCount(brandNew.length);
          setPendingJobs(incoming);
        } else {
          // Same jobs refreshed (updated data) — merge silently
          const map = new Map(prev.map(j => [String(j._id || j.id), j]));
          incoming.forEach(j => map.set(String(j._id || j.id), j));
          setRefreshedAt(new Date());
          return Array.from(map.values());
        }
        return prev;
      });
    });

    return () => SocketService.offNewJobs();
  }, []); // run once; SocketService is stable

  // ── Re-apply filter whenever allJobs or timeFilter changes ─────────────────
  useEffect(() => {
    setJobs(applyFilter(allJobs, timeFilter));
  }, [allJobs, timeFilter, applyFilter]);

  // ── Search form handler ──────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    loadJobs(searchQuery || 'software developer', searchLocation || 'India');
  };

  // ── Skip already-liked jobs ──────────────────────────────────────────────────
  const getNextUnlikedIndex = (startIndex, jobList) => {
    let idx = startIndex;
    while (idx < jobList.length) {
      const job   = jobList[idx];
      const jobId = job._id || job.id;
      if (!jobId || !likedJobIds.includes(jobId)) break;
      idx++;
    }
    return idx;
  };

  const effectiveIndex = getNextUnlikedIndex(jobIndex, jobs);
  const currentJob     = jobs[effectiveIndex];
  const isComplete     = !loading && effectiveIndex >= jobs.length;

  // ── Track job view ────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentJob) {
      const jobId = currentJob._id || currentJob.id;
      trackJobView(jobId);
      if (currentUser?.id && jobId) {
        ApiService.trackJobView({ userId: currentUser.id, jobId }).catch(() => {});
      }
    }
  }, [currentJob?._id, currentJob?.id, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLike = () => {
    if (currentJob) {
      onMatch(currentJob);
      setJobIndex(getNextUnlikedIndex(effectiveIndex + 1, jobs));
    }
  };

  const handleDislike = () => {
    onSkip();
    setJobIndex(getNextUnlikedIndex(effectiveIndex + 1, jobs));
  };

  const handleFilterChange = (filter) => {
    setTimeFilter(filter);
    setJobIndex(0);
  };

  const handleManualRefresh = () => {
    loadJobs(searchQuery || 'software developer', searchLocation || 'India');
  };

  return (
    <div className="h-full max-w-[860px] mx-auto flex flex-col min-h-0 gap-2">

      {/* ── Search + filter bar ─────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-4 text-white shrink-0"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 8px 30px rgba(102,126,234,0.4)',
        }}
      >
        {/* Search form */}
        <form className="mb-3" onSubmit={handleSearch}>
          <div className="flex gap-2.5 flex-wrap">
            <div className="flex-[1.35_1_300px] min-w-[280px] flex items-center bg-white/20 border-2 border-white/30 rounded-2xl px-4 gap-2.5 backdrop-blur-md transition-all focus-within:border-white/70 focus-within:bg-white/30">
              <span className="text-base shrink-0">🔍</span>
              <input
                type="text"
                className="w-full min-w-0 border-none bg-transparent py-3.5 text-sm text-white outline-none font-medium placeholder:text-white/70"
                placeholder="Job title or skills (e.g. React Developer)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-[1_1_220px] min-w-[200px] flex items-center bg-white/20 border-2 border-white/30 rounded-2xl px-4 gap-2.5 backdrop-blur-md transition-all focus-within:border-white/70 focus-within:bg-white/30">
              <span className="text-base shrink-0">📍</span>
              <input
                type="text"
                className="w-full min-w-0 border-none bg-transparent py-3.5 text-sm text-white outline-none font-medium placeholder:text-white/70"
                placeholder="Location (e.g. Bengaluru, India)"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="py-3 px-6 bg-white text-[#667eea] text-sm font-extrabold border-none rounded-2xl cursor-pointer whitespace-nowrap transition-all ease-in-out shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.25)] disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '⏳ Loading...' : '🚀 Search Jobs'}
            </button>
          </div>
        </form>

        {/* Filter bar */}
        <div className="mb-2.5">
          <FilterBar active={timeFilter} onChange={handleFilterChange} counts={filterCounts} />
        </div>

        {/* Source pills + status row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white text-[11px] font-bold py-[3px] px-2.5 rounded-xl" style={{ background: '#ff6b35' }}>Naukri</span>
          <span className="text-white text-[11px] font-bold py-[3px] px-2.5 rounded-xl" style={{ background: '#0077b5' }}>LinkedIn</span>
          <span className="text-white text-[11px] font-bold py-[3px] px-2.5 rounded-xl" style={{ background: '#2164f3' }}>Indeed</span>
          <span className="text-white text-[11px] font-bold py-[3px] px-2.5 rounded-xl" style={{ background: '#0caa41' }}>Glassdoor</span>
          <span className="text-xs text-white/60 ml-1">— Jobs from top portals</span>

          {/* Last-refreshed + manual refresh */}
          {lastRefreshLabel && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/70 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Updated {lastRefreshLabel}
              <button
                className="ml-1 px-2 py-0.5 bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold rounded-lg border-none cursor-pointer transition-colors"
                onClick={handleManualRefresh}
                title="Refresh now"
              >↻</button>
            </span>
          )}
        </div>

        {/* New-since-last-visit indicator */}
        {newSinceLastVisitCount > 0 && (
          <div className="mt-2">
            <NewSinceVisitBadge count={newSinceLastVisitCount} />
          </div>
        )}

        {/* Fallback notice */}
        {usingFallback && (
          <div className="mt-2.5 px-3.5 py-2 bg-white/20 rounded-[10px] text-xs text-white/90 font-medium">
            📋 Showing {allJobs.length} curated jobs · Start backend server for live jobs
          </div>
        )}
      </div>

      {/* ── New jobs banner (pending socket push) ──────────────────────── */}
      {pendingNewCount > 0 && (
        <NewJobsBanner
          count={pendingNewCount}
          onRefresh={() => { commitPending(); setJobIndex(0); }}
          onDismiss={() => { setPendingNewCount(0); setPendingJobs(null); }}
        />
      )}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-10 px-5 text-slate-500 text-[15px]">
          <div className="w-9 h-9 border-[3px] border-slate-200 border-t-[#667eea] rounded-full animate-spin" />
          <p>Fetching latest jobs from Naukri, LinkedIn, Indeed, Glassdoor...</p>
        </div>
      )}

      {/* ── Empty state for active filter ──────────────────────────────── */}
      {!loading && !isComplete && jobs.length === 0 && allJobs.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center px-5">
          <div className="text-5xl">🔍</div>
          <h3 className="text-lg font-bold text-gray-700 m-0">No jobs match this filter</h3>
          <p className="text-sm text-gray-500 m-0">Try a wider time range or browse all jobs.</p>
          <button
            className="mt-2 px-6 py-2.5 text-white font-semibold rounded-xl border-none cursor-pointer text-sm"
            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
            onClick={() => handleFilterChange('all')}
          >View All Jobs</button>
        </div>
      )}

      {/* ── All done ─────────────────────────────────────────────────────── */}
      {!loading && isComplete && (
        <div className="flex items-center justify-center min-h-[400px] p-5" data-testid="completion-message">
          <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.1)] p-12 text-center max-w-[500px]">
            <h2 className="text-[32px] font-bold mt-0 mb-4 text-[#333]">🎉 All Done!</h2>
            <p className="text-lg text-[#666] mt-0 mb-8">You've reviewed all {jobs.length} job postings.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                className="text-white py-3.5 px-8 text-base font-semibold border-none rounded-xl cursor-pointer transition-all ease-in-out shadow-[0_4px_12px_rgba(102,126,234,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(102,126,234,0.45)]"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                onClick={onNavigateToMatches}
              >
                View Your Matches
              </button>
              <button
                className="bg-white text-[#667eea] py-3.5 px-8 text-base font-semibold border-2 border-[#667eea] rounded-xl cursor-pointer transition-all ease-in-out hover:bg-[#f0f4ff] hover:-translate-y-0.5"
                onClick={() => { mergeJobs(MOCK_JOBS); setJobIndex(0); setUsingFallback(true); }}
              >
                🔄 Browse Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Job card ─────────────────────────────────────────────────────── */}
      {!loading && !isComplete && currentJob && (
        <>
          {/* Counter row */}
          <div className="text-center text-sm text-[#666] mb-1 font-medium flex items-center justify-center gap-2 shrink-0 flex-wrap">
            <span>Job {effectiveIndex + 1} of {jobs.length}</span>
            {!usingFallback && (
              <span className="text-xs bg-[#e6ffed] text-[#276749] py-0.5 px-2.5 rounded-xl font-semibold">🟢 Live</span>
            )}
            {newSinceLastVisitCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 py-0.5 px-2.5 rounded-xl font-semibold">
                🕐 {newSinceLastVisitCount} new since last visit
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 flex items-start justify-center overflow-hidden">
            <JobCard
              job={currentJob}
              onLike={handleLike}
              onDislike={handleDislike}
              currentUser={currentUser}
              isNewSinceVisit={isNewSinceLastVisit(currentJob, lastVisit)}
            />
          </div>
        </>
      )}
    </div>
  );
};
