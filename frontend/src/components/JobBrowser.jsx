// JobBrowser Component — Live jobs from Naukri, LinkedIn, Indeed, Glassdoor
// Falls back to mock jobs when backend is unreachable

import React, { useState, useEffect, useCallback } from 'react';
import { JobCard } from './JobCard';
import ApiService from '../services/ApiService';
import { MOCK_JOBS } from '../data/mockJobs';
import { trackJobView } from './AnalyticsPage';

const DEFAULT_SEARCHES = [
  { query: 'software developer', location: 'India' },
  { query: 'data scientist', location: 'India' },
  { query: 'product manager', location: 'India' },
];

export const JobBrowser = ({ onMatch, onSkip, onNavigateToMatches, currentUser, likedJobIds = [] }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('India');
  const [jobIndex, setJobIndex] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadJobs = useCallback(async (query, location) => {
    setLoading(true);
    setUsingFallback(false);
    try {
      const result = await ApiService.fetchExternalJobs({ query, location });
      const fetched = result.jobs || [];
      if (fetched.length === 0) throw new Error('No jobs returned');
      setJobs(fetched);
      setJobIndex(0);
    } catch (err) {
      console.warn('Backend unavailable, using mock jobs:', err.message);
      // Filter mock jobs by query if provided
      const q = query.toLowerCase();
      const filtered = q && q !== 'software developer'
        ? MOCK_JOBS.filter(j =>
            j.title.toLowerCase().includes(q) ||
            j.tags.some(t => t.toLowerCase().includes(q)) ||
            j.company.toLowerCase().includes(q)
          )
        : MOCK_JOBS;
      setJobs(filtered.length > 0 ? filtered : MOCK_JOBS);
      setJobIndex(0);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, load all jobs
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setUsingFallback(false);
      try {
        const results = await Promise.all(
          DEFAULT_SEARCHES.map(s => ApiService.fetchExternalJobs(s))
        );
        const seen = new Set();
        const merged = [];
        for (const r of results) {
          for (const job of (r.jobs || [])) {
            if (!seen.has(job._id)) {
              seen.add(job._id);
              merged.push(job);
            }
          }
        }
        if (merged.length === 0) throw new Error('No jobs from backend');
        setJobs(merged);
        setJobIndex(0);
      } catch (err) {
        console.warn('Backend unavailable, loading all mock jobs:', err.message);
        setJobs(MOCK_JOBS);
        setJobIndex(0);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadJobs(searchQuery || 'software developer', searchLocation || 'India');
  };

  // Skip over already-liked jobs
  const getNextUnlikedIndex = (startIndex, jobList) => {
    let idx = startIndex;
    while (idx < jobList.length) {
      const job = jobList[idx];
      const jobId = job._id || job.id;
      if (!jobId || !likedJobIds.includes(jobId)) break;
      idx++;
    }
    return idx;
  };

  // Effective index skips liked jobs
  const effectiveIndex = getNextUnlikedIndex(jobIndex, jobs);
  const currentJob = jobs[effectiveIndex];
  const isComplete = !loading && effectiveIndex >= jobs.length;

  // Track job view whenever the current job changes
  useEffect(() => {
    if (currentJob) {
      const jobId = currentJob._id || currentJob.id;
      trackJobView(jobId);
      if (currentUser?.id && jobId) {
        ApiService.trackJobView({ userId: currentUser.id, jobId }).catch((error) => {
          console.warn('Unable to sync job view:', error.message);
        });
      }
    }
  }, [currentJob?._id, currentJob?.id, currentUser?.id]);

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

  return (
    /* .job-browser */
    <div className="h-full max-w-[860px] mx-auto flex flex-col min-h-0">
      {/* Search Bar — .job-search-bar */}
      <div
        className="rounded-3xl p-4 mb-3 text-white shrink-0"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 8px 30px rgba(102,126,234,0.4)',
        }}
      >
        {/* .search-form */}
        <form className="mb-3" onSubmit={handleSearch}>
          {/* .search-inputs */}
          <div className="flex gap-2.5 flex-wrap">
            {/* .search-input-wrap */}
            <div className="flex-[1.35_1_300px] min-w-[280px] flex items-center bg-white/20 border-2 border-white/30 rounded-2xl px-4 gap-2.5 backdrop-blur-md transition-all focus-within:border-white/70 focus-within:bg-white/30">
              {/* .search-icon */}
              <span className="text-base shrink-0">🔍</span>
              {/* .search-input */}
              <input
                type="text"
                className="w-full min-w-0 border-none bg-transparent py-3.5 text-sm text-white outline-none font-medium placeholder:text-white/70"
                placeholder="Job title or skills (e.g. React Developer)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* .search-input-wrap */}
            <div className="flex-[1_1_220px] min-w-[200px] flex items-center bg-white/20 border-2 border-white/30 rounded-2xl px-4 gap-2.5 backdrop-blur-md transition-all focus-within:border-white/70 focus-within:bg-white/30">
              {/* .search-icon */}
              <span className="text-base shrink-0">📍</span>
              {/* .search-input */}
              <input
                type="text"
                className="w-full min-w-0 border-none bg-transparent py-3.5 text-sm text-white outline-none font-medium placeholder:text-white/70"
                placeholder="Location (e.g. Bengaluru, India)"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
            </div>
            {/* .search-btn */}
            <button
              type="submit"
              className="py-3 px-6 bg-white text-[#667eea] text-sm font-extrabold border-none rounded-2xl cursor-pointer whitespace-nowrap transition-all ease-in-out shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.25)] disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '⏳ Loading...' : '🚀 Search Jobs'}
            </button>
          </div>
        </form>

        {/* .job-sources-info */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* .source-pill */}
          <span className="text-white text-[11px] font-bold py-[3px] px-2.5 rounded-xl" style={{ background: '#ff6b35' }}>Naukri</span>
          <span className="text-white text-[11px] font-bold py-[3px] px-2.5 rounded-xl" style={{ background: '#0077b5' }}>LinkedIn</span>
          <span className="text-white text-[11px] font-bold py-[3px] px-2.5 rounded-xl" style={{ background: '#2164f3' }}>Indeed</span>
          <span className="text-white text-[11px] font-bold py-[3px] px-2.5 rounded-xl" style={{ background: '#0caa41' }}>Glassdoor</span>
          {/* .source-label */}
          <span className="text-xs text-slate-400">— Jobs from top portals</span>
        </div>

        {/* .fallback-notice */}
        {usingFallback && (
          <div className="mt-2.5 px-3.5 py-2 bg-white/20 rounded-[10px] text-xs text-white/90 font-medium">
            📋 Showing {jobs.length} curated jobs · Start backend server for live jobs
          </div>
        )}
      </div>

      {/* Loading — .external-loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-10 px-5 text-slate-500 text-[15px]">
          {/* .loading-spinner-small */}
          <div className="w-9 h-9 border-[3px] border-slate-200 border-t-[#667eea] rounded-full animate-spin"></div>
          <p>Fetching latest jobs from Naukri, LinkedIn, Indeed, Glassdoor...</p>
        </div>
      )}

      {/* All done — .job-browser-complete */}
      {!loading && isComplete && (
        <div className="flex items-center justify-center min-h-[400px] p-5" data-testid="completion-message">
          {/* .complete-card */}
          <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.1)] p-12 text-center max-w-[500px]">
            <h2 className="text-[32px] font-bold mt-0 mb-4 text-[#333]">🎉 All Done!</h2>
            <p className="text-lg text-[#666] mt-0 mb-8">You've reviewed all {jobs.length} job postings.</p>
            {/* .complete-actions */}
            <div className="flex gap-3 justify-center flex-wrap">
              {/* .btn-primary */}
              <button
                className="text-white py-3.5 px-8 text-base font-semibold border-none rounded-xl cursor-pointer transition-all ease-in-out shadow-[0_4px_12px_rgba(102,126,234,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(102,126,234,0.45)]"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                onClick={onNavigateToMatches}
              >
                View Your Matches
              </button>
              {/* .btn-secondary-action */}
              <button
                className="bg-white text-[#667eea] py-3.5 px-8 text-base font-semibold border-2 border-[#667eea] rounded-xl cursor-pointer transition-all ease-in-out hover:bg-[#f0f4ff] hover:-translate-y-0.5"
                onClick={() => { setJobs(MOCK_JOBS); setJobIndex(0); }}
              >
                🔄 Browse Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job card */}
      {!loading && !isComplete && currentJob && (
        <>
          {/* .job-counter */}
          <div className="text-center text-sm text-[#666] mb-2 font-medium flex items-center justify-center gap-2 shrink-0">
            Job {effectiveIndex + 1} of {jobs.length}
            {/* .live-badge */}
            {!usingFallback && (
              <span className="text-xs bg-[#e6ffed] text-[#276749] py-0.5 px-2.5 rounded-xl font-semibold">🟢 Live</span>
            )}
          </div>
          <div className="min-h-0 flex-1 flex items-start justify-center overflow-hidden">
            <JobCard
              job={currentJob}
              onLike={handleLike}
              onDislike={handleDislike}
              currentUser={currentUser}
            />
          </div>
        </>
      )}
    </div>
  );
};
