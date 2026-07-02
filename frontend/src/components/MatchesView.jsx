// MatchesView — Application tracker with 6-stage status pipeline

import React, { useState } from 'react';
import ApiService from '../services/ApiService';
import SharedApplyModal from './ApplyModal';
import { matchColor } from '../services/MatchingService';
import { timeAgo } from '../hooks/useJobAge';

const STATUS_CONFIG = {
  saved:                { label: 'Saved',               icon: '🔖', color: '#667eea', bg: '#ebf4ff', step: 0 },
  applied:              { label: 'Applied',             icon: '📤', color: '#f6ad55', bg: '#fffaf0', step: 1 },
  under_review:         { label: 'Under Review',        icon: '🔍', color: '#3182ce', bg: '#ebf8ff', step: 2 },
  interview_scheduled:  { label: 'Interview Scheduled', icon: '📅', color: '#805ad5', bg: '#faf5ff', step: 3 },
  offer:                { label: 'Offer 🎉',            icon: '🎉', color: '#38a169', bg: '#f0fff4', step: 4 },
  rejected:             { label: 'Rejected',            icon: '❌', color: '#e53e3e', bg: '#fff5f5', step: -1 },
};

const PIPELINE_STEPS = ['saved', 'applied', 'under_review', 'interview_scheduled', 'offer'];

const SOURCE_COLORS = {
  'Naukri':    '#ff6b35', 'LinkedIn': '#0077b5', 'Indeed': '#2164f3',
  'Glassdoor': '#0caa41', 'Recruiter': '#38a169', 'External': '#764ba2',
};

// ── Status pipeline tracker ──────────────────────────────────────────────────
const StatusPipeline = ({ currentStatus }) => {
  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.saved;
  const currentStep = cfg.step;
  if (currentStatus === 'rejected') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="w-full h-1.5 rounded-full bg-red-200 relative overflow-hidden">
          <div className="h-full rounded-full bg-red-400" style={{ width: '100%' }} />
        </div>
        <span className="text-xs font-bold text-red-500 whitespace-nowrap">❌ Rejected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 mt-2 w-full">
      {PIPELINE_STEPS.map((step, i) => {
        const s = STATUS_CONFIG[step];
        const done    = i <  currentStep;
        const active  = i === currentStep;
        const pending = i >  currentStep;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0" title={s.label}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] border-2 transition-all ${active ? 'border-current scale-110 shadow-md' : done ? 'border-transparent' : 'border-gray-200 bg-gray-100'}`}
                style={ active || done ? { background: s.color, borderColor: s.color, color: '#fff' } : {} }>
                {done ? '✓' : s.icon}
              </div>
              <span className={`text-[9px] font-semibold whitespace-nowrap ${active ? 'text-indigo-600' : done ? 'text-gray-500' : 'text-gray-300'}`}>{s.label.split(' ')[0]}</span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="flex-1 h-0.5 rounded-full mx-0.5 transition-all" style={{ background: done || active ? STATUS_CONFIG[PIPELINE_STEPS[i+1]]?.color || '#667eea' : '#e2e8f0' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Match card ───────────────────────────────────────────────────────────────
const MatchCard = ({ match, isSelected, onSelect, onApply, onStatusChange, currentUser }) => {
  const jobId = match.job.id || match.job._id;
  const source = match.job.source;
  const srcColor = SOURCE_COLORS[source] || '#764ba2';
  const status = match.applicationStatus || (match.applied ? 'applied' : 'saved');
  const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG.saved;
  const mc   = match.matchScore ? matchColor(match.matchScore) : null;
  const [applyJob, setApplyJob] = useState(null);

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.07)] px-5 py-4 cursor-pointer transition-all duration-200 border-2 relative overflow-hidden hover:shadow-[0_8px_25px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 ${isSelected ? 'border-indigo-400 shadow-[0_8px_25px_rgba(102,126,234,0.2)]' : 'border-transparent hover:border-indigo-100'}`}
        onClick={onSelect}>
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: `linear-gradient(135deg,#667eea,#764ba2)` }} />

        <div className="flex items-start gap-3 pl-1">
          {/* Logo / initial */}
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.15)]"
            style={{ background: `linear-gradient(135deg,${srcColor},#764ba2)` }}>
            {match.job.company.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="text-base font-bold text-gray-800 m-0">{match.job.title}</h3>
              {source && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: srcColor }}>{source}</span>}
            </div>
            <p className="text-sm text-gray-500 m-0">{match.job.company} · {match.job.location}</p>
            {match.job.salary && <p className="text-xs text-green-600 font-semibold m-0 mt-0.5">💰 {match.job.salary}</p>}

            {/* Match score */}
            {mc && match.matchScore > 0 && (
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border"
                style={{ background: mc.bg, color: mc.text, borderColor: mc.border }}>
                🎯 {match.matchScore}% match
              </span>
            )}

            {/* Tags */}
            {match.job.tags?.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1.5">
                {match.job.tags.slice(0, 3).map((t, i) => (
                  <span key={i} className="text-indigo-600 px-2 py-0.5 rounded-xl text-[10px] font-semibold border border-indigo-100" style={{ background: '#eef2ff' }}>{t}</span>
                ))}
              </div>
            )}

            {/* Status pipeline */}
            <StatusPipeline currentStatus={status} />
          </div>

          {/* Right actions */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
            {/* Current status badge */}
            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.icon} {cfg.label}
            </span>

            {/* Update status */}
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 cursor-pointer outline-none hover:border-indigo-300"
              value={status} onChange={e => onStatusChange(match.id, e.target.value)}
              onClick={e => e.stopPropagation()}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>

            {/* Apply / Applied */}
            {match.applied ? (
              <span className="text-[11px] font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">✅ Applied</span>
            ) : (
              <button className="px-3.5 py-1.5 text-xs font-bold text-white border-none rounded-xl cursor-pointer shadow-[0_3px_10px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 transition-all whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                onClick={e => { e.stopPropagation(); setApplyJob(match.job); }}>
                🚀 Apply
              </button>
            )}

            <span className="text-[10px] text-gray-400">{timeAgo(match.matchedAt)}</span>
          </div>
        </div>
      </div>

      {/* Apply modal */}
      {applyJob && (
        <SharedApplyModal job={applyJob} currentUser={currentUser} onClose={() => setApplyJob(null)}
          onApply={(jobId) => { onApply(match.id); setApplyJob(null); }} />
      )}
    </>
  );
};

// ── Main MatchesView ─────────────────────────────────────────────────────────
export const MatchesView = ({ matches, onApply, onUndoApply, onNavigateToBrowser, currentUser }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const handleStatusChange = async (matchId, status) => {
    try {
      await ApiService.updateMatchStatus(matchId, status);
      if (status === 'applied') onApply(matchId);
    } catch (err) {
      console.warn('Status update failed:', err.message);
      if (status === 'applied') onApply(matchId);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-5">
        <div className="bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] p-12 text-center max-w-[500px] flex flex-col items-center gap-4">
          <div className="text-6xl">🎯</div>
          <h2 className="text-2xl font-bold m-0 text-gray-800">No Matches Yet</h2>
          <p className="text-gray-500 m-0">Swipe right on jobs you're interested in to save them here.</p>
          <button className="py-3.5 px-8 text-sm font-semibold text-white border-none rounded-xl cursor-pointer transition-all shadow-[0_4px_12px_rgba(102,126,234,0.35)] hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }} onClick={onNavigateToBrowser}>
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  // Filter tabs
  const statusCounts = {};
  for (const m of matches) {
    const s = m.applicationStatus || (m.applied ? 'applied' : 'saved');
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const filteredMatches = filterStatus === 'all'
    ? matches
    : matches.filter(m => (m.applicationStatus || (m.applied ? 'applied' : 'saved')) === filterStatus);

  const selectedMatch = selectedId ? matches.find(m => (m.job.id || m.job._id) === selectedId) : null;
  const selStatus = selectedMatch?.applicationStatus || (selectedMatch?.applied ? 'applied' : 'saved');

  return (
    <div className="px-4 py-5 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="mb-5 px-6 py-5 rounded-2xl text-white shadow-[0_8px_25px_rgba(102,126,234,0.4)]"
        style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
        <h2 className="text-2xl font-extrabold text-white m-0 mb-1">Your Matches ({matches.length})</h2>
        <p className="text-white/70 text-sm m-0">Track your job applications through every stage</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFilterStatus('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 cursor-pointer transition-all ${filterStatus === 'all' ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
          style={filterStatus === 'all' ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {}}>
          All ({matches.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => {
          const count = statusCounts[k] || 0;
          if (count === 0) return null;
          return (
            <button key={k} onClick={() => setFilterStatus(k)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 cursor-pointer transition-all ${filterStatus === k ? 'text-white border-transparent' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
              style={filterStatus === k ? { background: v.color } : { color: v.color }}>
              {v.icon} {v.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Match cards */}
      <div className="flex flex-col gap-3 mb-5">
        {filteredMatches.map(match => {
          const jobId = match.job.id || match.job._id;
          return (
            <MatchCard key={jobId} match={match} isSelected={selectedId === jobId}
              onSelect={() => setSelectedId(prev => prev === jobId ? null : jobId)}
              onApply={onApply} onStatusChange={handleStatusChange} currentUser={currentUser} />
          );
        })}
        {filteredMatches.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No applications in this stage.</div>
        )}
      </div>

      {/* Detail panel */}
      {selectedMatch && (
        <div className="bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] p-6 border border-gray-200">
          <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-gray-100 flex-wrap">
            <div>
              <h3 className="text-xl font-bold text-gray-800 m-0 mb-1">{selectedMatch.job.title}</h3>
              <p className="text-gray-500 m-0">{selectedMatch.job.company} · {selectedMatch.job.location}</p>
            </div>
            {!selectedMatch.applied && (
              <button className="flex-shrink-0 px-5 py-2.5 text-white text-sm font-bold border-none rounded-[14px] cursor-pointer transition-all shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                onClick={() => handleStatusChange(selectedMatch.id, 'applied')}>
                🚀 Mark as Applied
              </button>
            )}
          </div>

          {/* Pipeline */}
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Application Stage</p>
            <StatusPipeline currentStatus={selStatus} />
          </div>

          {/* Why matches */}
          {selectedMatch.matchDetails && selectedMatch.matchScore > 0 && (
            <div className="mb-4 p-4 rounded-xl border bg-indigo-50 border-indigo-100">
              <p className="text-sm font-bold text-indigo-700 m-0 mb-2">💡 Why this job matches you ({selectedMatch.matchScore}%)</p>
              {selectedMatch.matchDetails.matchedSkills?.length > 0 && <p className="text-xs text-gray-700 m-0 mb-1"><span className="font-semibold text-green-700">✅ Skills:</span> {selectedMatch.matchDetails.matchedSkills.join(', ')}</p>}
              {selectedMatch.matchDetails.matchedDomain && <p className="text-xs text-green-700 m-0 mb-1">✅ Domain match</p>}
              {selectedMatch.matchDetails.matchedLocation && <p className="text-xs text-green-700 m-0 mb-1">✅ Location match</p>}
              {selectedMatch.matchDetails.missingSkills?.length > 0 && <p className="text-xs text-gray-600 m-0"><span className="font-semibold text-orange-500">⚠️ Missing:</span> {selectedMatch.matchDetails.missingSkills.join(', ')}</p>}
            </div>
          )}

          <div className="flex gap-5 mb-4 text-sm text-gray-600 flex-wrap">
            {selectedMatch.job.location && <span>📍 {selectedMatch.job.location}</span>}
            {selectedMatch.job.salary   && <span>💰 {selectedMatch.job.salary}</span>}
          </div>
          {selectedMatch.job.description && <p className="text-sm text-gray-600 leading-relaxed m-0">{selectedMatch.job.description}</p>}
          <p className="text-xs text-gray-400 mt-4 m-0">Saved {timeAgo(selectedMatch.matchedAt)}</p>
        </div>
      )}
    </div>
  );
};
