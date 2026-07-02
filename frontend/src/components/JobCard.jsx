// JobCard Component — Swipe right to like, swipe left to pass

import React, { useState, useRef, useCallback } from 'react';
import ApiService from '../services/ApiService';
import SharedApplyModal from './ApplyModal';
import { getJobBadge, timeAgo } from '../hooks/useJobAge';
import { matchColor } from '../services/MatchingService';

const SOURCE_COLORS = {
  'Naukri':    { bg: '#ff6b35', text: '#fff' },
  'LinkedIn':  { bg: '#0077b5', text: '#fff' },
  'Indeed':    { bg: '#2164f3', text: '#fff' },
  'Glassdoor': { bg: '#0caa41', text: '#fff' },
  'External':  { bg: '#764ba2', text: '#fff' },
  'Recruiter': { bg: '#38a169', text: '#fff' },
  'mock':      { bg: '#667eea', text: '#fff' },
};

const BADGE_STYLES = {
  green:  { bg: '#c6f6d5', text: '#22543d', border: '#9ae6b4' },
  blue:   { bg: '#bee3f8', text: '#2a4365', border: '#90cdf4' },
  purple: { bg: '#e9d8fd', text: '#44337a', border: '#d6bcfa' },
};

const WORK_MODE_COLORS = {
  Remote: { bg: '#c6f6d5', text: '#22543d' },
  Hybrid: { bg: '#bee3f8', text: '#2a4365' },
  Onsite: { bg: '#e9d8fd', text: '#44337a' },
};

// ── Why-This-Matches panel ───────────────────────────────────────────────────
const WhyMatchPanel = ({ matchDetails, matchScore }) => {
  if (!matchDetails) return null;
  const { matchedSkills, missingSkills, matchedDomain, matchedLocation, experienceMatch } = matchDetails;
  const mc = matchColor(matchScore);
  return (
    <div className="mt-3 p-3.5 rounded-xl border text-[12px]" style={{ background: mc.bg, borderColor: mc.border }}>
      <p className="font-bold m-0 mb-2" style={{ color: mc.text }}>💡 Why this matches you</p>
      {matchedSkills.length > 0 && (
        <div className="mb-1.5">
          <span className="font-semibold text-green-700">✅ Matched skills: </span>
          <span className="text-gray-700">{matchedSkills.join(', ')}</span>
        </div>
      )}
      {matchedDomain && <p className="m-0 mb-1 text-green-700">✅ Domain matches your preference</p>}
      {matchedLocation && <p className="m-0 mb-1 text-green-700">✅ Location matches your preference</p>}
      {experienceMatch && <p className="m-0 mb-1 text-green-700">✅ Experience level fits</p>}
      {missingSkills.length > 0 && (
        <div className="mt-1.5">
          <span className="font-semibold text-orange-600">⚠️ Missing skills: </span>
          <span className="text-gray-600">{missingSkills.join(', ')}</span>
        </div>
      )}
    </div>
  );
};

// ── Apply Modal (inline) ─────────────────────────────────────────────────────
const ApplyModal = ({ job, onClose, currentUser }) => {
  const [form, setForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: '', experience: '', coverLetter: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.name.trim())  { setError('Full name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) { setError('Invalid email.'); return; }
    if (!form.experience)   { setError('Please select your experience.'); return; }
    setLoading(true);
    try {
      const result = await ApiService.applyToJob({ name: form.name, email: form.email, phone: form.phone, experience: form.experience, coverLetter: form.coverLetter, jobTitle: job.title, company: job.company, location: job.location, salary: job.salary, jobId: job._id || job.id });
      setSuccess(result.message || 'Application submitted!');
      if (result.previewUrl) setPreviewUrl(result.previewUrl);
    } catch (err) { setError(err.message || 'Failed to submit.'); }
    finally { setLoading(false); }
  };

  const ic = 'px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 transition-all font-[inherit] outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]';

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[2000] p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_30px_80px_rgba(0,0,0,0.4)] relative" onClick={e => e.stopPropagation()}>
        <button className="absolute top-4 right-4 bg-gray-50 border-none text-2xl text-gray-500 cursor-pointer w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 z-10" onClick={onClose}>×</button>
        <div className="px-7 pt-6 pb-5 rounded-t-3xl" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <h2 className="text-white text-xl font-extrabold m-0 mb-1">Apply for {job.title}</h2>
          <p className="text-white/80 text-sm m-0">at <strong>{job.company}</strong> · {job.location}</p>
        </div>
        {success ? (
          <div className="px-7 py-10 text-center flex flex-col items-center gap-3">
            <div className="text-5xl">✅</div>
            <h3 className="text-xl font-extrabold text-green-900 m-0">Application Submitted!</h3>
            <p className="text-gray-600 m-0">{success}</p>
            {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-5 py-2.5 text-white font-bold text-sm rounded-xl no-underline" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>📬 View Email</a>}
            <button className="w-full mt-2 py-3 text-white font-bold rounded-xl border-none cursor-pointer" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="px-7 py-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Full Name *</label><input type="text" name="name" value={form.name} onChange={handleChange} required disabled={loading} className={ic} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Email *</label><input type="email" name="email" value={form.email} onChange={handleChange} required disabled={loading} className={ic} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Phone</label><input type="tel" name="phone" value={form.phone} onChange={handleChange} disabled={loading} className={ic} placeholder="+91 98765 43210" /></div>
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Experience *</label>
                <select name="experience" value={form.experience} onChange={handleChange} required disabled={loading} className={ic}>
                  <option value="">Select...</option>
                  {['Fresher (0 years)','0-1 years','1-2 years','2-4 years','4-6 years','6-10 years','10+ years'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Cover Letter</label><textarea name="coverLetter" value={form.coverLetter} onChange={handleChange} rows={3} disabled={loading} className={`${ic} resize-y min-h-[80px]`} placeholder="Why are you a great fit?" /></div>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-[10px] text-[13px] border-l-4 border-red-400">⚠️ {error}</div>}
            <button type="submit" disabled={loading} className="w-full py-3 text-white font-bold rounded-xl border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</> : '🚀 Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ── Main JobCard ─────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 100;
const SWIPE_ANGLE_LIMIT = 30;

export const JobCard = ({ job, onLike, onDislike, currentUser, isNewSinceVisit = false }) => {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showFullDesc, setShowFullDesc]     = useState(false);
  const [showWhyMatch, setShowWhyMatch]     = useState(false);
  const [isDragging, setIsDragging]         = useState(false);
  const [offset, setOffset]                 = useState({ x: 0, y: 0 });
  const [isFlying, setIsFlying]             = useState(false);
  const [swipeDir, setSwipeDir]             = useState(null);

  const cardRef  = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });

  const sourceStyle = SOURCE_COLORS[job.source] || SOURCE_COLORS['External'];
  const badge       = getJobBadge(job);
  const badgeStyle  = badge ? BADGE_STYLES[badge.color] : null;
  const postedLabel = timeAgo(job.createdAt || job.postedAt);
  const shortDesc   = job.description?.slice(0, 130);
  const hasMore     = (job.description?.length || 0) > 130;

  // Match score
  const score  = job.matchScore || 0;
  const mc     = matchColor(score);
  const hasMatch = score > 0;

  // Drag handlers
  const onDragStart = useCallback((cx, cy) => { startPos.current = { x: cx, y: cy }; setIsDragging(true); }, []);
  const onDragMove  = useCallback((cx, cy) => {
    if (!isDragging) return;
    const dx = cx - startPos.current.x, dy = cy - startPos.current.y;
    setOffset({ x: dx, y: dy });
    setSwipeDir(dx > 40 ? 'right' : dx < -40 ? 'left' : null);
  }, [isDragging]);
  const onDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const dx = offset.x;
    if (dx > SWIPE_THRESHOLD) {
      setIsFlying(true); setOffset({ x: 600, y: offset.y });
      setTimeout(() => { onLike(job._id || job.id); setOffset({ x: 0, y: 0 }); setSwipeDir(null); setIsFlying(false); }, 350);
    } else if (dx < -SWIPE_THRESHOLD) {
      setIsFlying(true); setOffset({ x: -600, y: offset.y });
      setTimeout(() => { onDislike(job._id || job.id); setOffset({ x: 0, y: 0 }); setSwipeDir(null); setIsFlying(false); }, 350);
    } else { setOffset({ x: 0, y: 0 }); setSwipeDir(null); }
  }, [isDragging, offset, job, onLike, onDislike]);

  const onMouseDown = (e) => { if (e.target.closest('button,a,select,textarea')) return; e.preventDefault(); onDragStart(e.clientX, e.clientY); };
  const onMouseMove = (e) => { if (isDragging) onDragMove(e.clientX, e.clientY); };
  const onMouseUp   = () => onDragEnd();
  const onTouchStart = (e) => { const t = e.touches[0]; onDragStart(t.clientX, t.clientY); };
  const onTouchMove  = (e) => { const t = e.touches[0]; onDragMove(t.clientX, t.clientY); };
  const onTouchEnd   = () => onDragEnd();

  const rotation = Math.min(Math.max(offset.x / 15, -SWIPE_ANGLE_LIMIT), SWIPE_ANGLE_LIMIT);
  const cardStyle = {
    transform: `translateX(${offset.x}px) translateY(${offset.y * 0.1}px) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : isFlying ? 'transform 0.35s ease' : 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  const likeOpacity = Math.min(Math.max(offset.x / SWIPE_THRESHOLD, 0), 1);
  const passOpacity = Math.min(Math.max(-offset.x / SWIPE_THRESHOLD, 0), 1);
  const workModeStyle = WORK_MODE_COLORS[job.workMode] || null;

  return (
    <>
      <div ref={cardRef} className="relative rounded-3xl p-5 max-w-[600px] w-full mx-auto overflow-hidden will-change-transform touch-pan-y animate-slide-up" data-testid="job-card"
        style={{ ...cardStyle, background: 'linear-gradient(135deg,#ffffff 0%,#f8f9ff 100%)', boxShadow: isNewSinceVisit ? '0 10px 40px rgba(251,191,36,0.35),0 2px 8px rgba(0,0,0,0.06)' : '0 10px 40px rgba(0,0,0,0.1),0 2px 8px rgba(0,0,0,0.06)', border: isNewSinceVisit ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.8)' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-[5px]" style={{ background: 'linear-gradient(90deg,#667eea 0%,#764ba2 33%,#f093fb 66%,#ff6b6b 100%)' }} />

        {/* Swipe indicators */}
        <div className="absolute top-6 left-5 px-5 py-2.5 rounded-xl text-[22px] font-black tracking-[2px] pointer-events-none z-10 border-4 border-green-400 text-green-400 bg-green-400/10 -rotate-[15deg]" style={{ opacity: likeOpacity }}>❤️ LIKE</div>
        <div className="absolute top-6 right-5 px-5 py-2.5 rounded-xl text-[22px] font-black tracking-[2px] pointer-events-none z-10 border-4 border-red-400 text-red-400 bg-red-400/10 rotate-[15deg]" style={{ opacity: passOpacity }}>✕ PASS</div>

        {/* Header */}
        <div className="flex justify-between items-start mb-3 pb-3 border-b-2 border-[#f0f0f5]">
          <div className="flex items-center gap-3">
            {job.companyLogo && <img src={job.companyLogo} alt={job.company} className="w-11 h-11 rounded-xl object-contain bg-gray-50 border border-gray-200 p-1" onError={e => { e.target.style.display = 'none'; }} />}
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-[0_3px_10px_rgba(102,126,234,0.3)]"
              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', display: job.companyLogo ? 'none' : 'flex' }}>
              {job.company.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-bold text-gray-900 m-0">{job.company}</h3>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[11px] text-gray-500">{job.jobType || 'Full-time'}</span>
                {workModeStyle && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: workModeStyle.bg, color: workModeStyle.text }}>{job.workMode}</span>
                )}
                {job.domain && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{job.domain}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right badges */}
          <div className="flex flex-col items-end gap-1.5">
            {/* Match score pill */}
            {hasMatch && (
              <button className="flex items-center gap-1 px-2.5 py-[4px] rounded-[20px] text-[11px] font-extrabold border cursor-pointer transition-all hover:scale-105"
                style={{ background: mc.bg, color: mc.text, borderColor: mc.border }}
                onClick={e => { e.stopPropagation(); setShowWhyMatch(v => !v); }}>
                🎯 {score}% match {showWhyMatch ? '▲' : '▼'}
              </button>
            )}
            {badge && badgeStyle && (
              <span className="px-2.5 py-[4px] rounded-[20px] text-[11px] font-extrabold border" style={{ background: badgeStyle.bg, color: badgeStyle.text, borderColor: badgeStyle.border }}>🆕 {badge.label}</span>
            )}
            {isNewSinceVisit && <span className="px-2.5 py-[4px] rounded-[20px] text-[11px] font-extrabold text-amber-800 border border-amber-300" style={{ background: '#fef3c7' }}>⭐ New for you</span>}
            {job.source && <span className="px-2.5 py-[4px] rounded-[20px] text-[11px] font-bold" style={{ background: sourceStyle.bg, color: sourceStyle.text }}>via {job.source === 'mock' ? 'Naukri' : job.source}</span>}
            <span className="text-[11px] text-gray-400">🕐 {postedLabel}</span>
          </div>
        </div>

        {/* Why match panel */}
        {showWhyMatch && <WhyMatchPanel matchDetails={job.matchDetails} matchScore={score} />}

        {/* Body */}
        <div className="mb-3">
          <h2 className="text-[22px] font-bold m-0 mb-2.5 leading-[1.25] bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>{job.title}</h2>

          {/* Meta chips */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-200 text-sm font-semibold text-gray-700"><span>📍</span>{job.location}</div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-200 text-sm font-semibold text-gray-700"><span>💰</span>{job.salary}</div>
            {(job.experienceRequired || job.experience) && (
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-200 text-sm font-semibold text-gray-700"><span>🧑‍💼</span>{job.experienceRequired || job.experience}</div>
            )}
          </div>

          {/* Description */}
          <div className="mt-2 leading-[1.55] text-gray-600 text-sm bg-white p-4 rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="m-0">{showFullDesc ? job.description : shortDesc}{hasMore && !showFullDesc && '...'}</p>
            {hasMore && (
              <button className="bg-transparent border-none text-indigo-500 text-[13px] font-semibold cursor-pointer p-0 pt-1 mt-1 block hover:underline"
                onClick={e => { e.stopPropagation(); setShowFullDesc(v => !v); }}>
                {showFullDesc ? 'Show less ▲' : 'Read more ▼'}
              </button>
            )}
          </div>

          {/* Skills */}
          {(job.skillsRequired?.length > 0 || job.requirements?.length > 0) && (
            <div className="mt-3">
              <p className="text-[13px] font-bold text-gray-600 m-0 mb-2">🛠 Required Skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {(job.skillsRequired?.length > 0 ? job.skillsRequired : job.requirements).map((req, i) => {
                  const matched = job.matchDetails?.matchedSkills?.includes(req);
                  return (
                    <span key={i} className="px-2.5 py-1 rounded-[20px] text-xs font-semibold border"
                      style={matched ? { background: '#c6f6d5', color: '#22543d', borderColor: '#9ae6b4' } : { background: 'linear-gradient(135deg,#fef3c7,#fde68a)', color: '#92400e', borderColor: '#fcd34d' }}>
                      {matched && '✓ '}{req}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {(job.tags?.length > 0 ? job.tags : ['Full-time', 'India']).map((tag, i) => (
              <span key={i} className="px-3 py-1.5 rounded-[20px] text-xs font-semibold border border-indigo-200 text-indigo-600" style={{ background: 'linear-gradient(135deg,#e0e7ff,#f3e8ff)' }}>{tag}</span>
            ))}
          </div>

          {/* Deadline */}
          {job.deadline && (
            <p className="text-xs text-red-500 font-semibold mt-2 m-0">⏰ Apply by {new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          )}

          {/* Apply button */}
          <button className="block w-full mt-3 px-6 py-3 text-white text-sm font-bold border-none rounded-[14px] cursor-pointer transition-all text-center shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)]"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
            onClick={e => { e.stopPropagation(); setShowApplyModal(true); }}>
            🚀 Apply Now — via TINCLO
          </button>
        </div>

        {/* Swipe hints */}
        <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
          <span className="text-[11px] text-red-400 font-medium">← Swipe left to pass</span>
          <span className="text-[11px] text-green-400 font-medium">Swipe right to like →</span>
        </div>
      </div>

      {showApplyModal && <SharedApplyModal job={job} currentUser={currentUser} onClose={() => setShowApplyModal(false)} />}
    </>
  );
};
