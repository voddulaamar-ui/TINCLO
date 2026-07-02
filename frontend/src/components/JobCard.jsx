// JobCard Component - Swipe right to like, swipe left to pass

import React, { useState, useRef, useCallback } from 'react';
import ApiService from '../services/ApiService';
import SharedApplyModal from './ApplyModal';

const SOURCE_COLORS = {
  'Naukri':    { bg: '#ff6b35', text: '#fff' },
  'LinkedIn':  { bg: '#0077b5', text: '#fff' },
  'Indeed':    { bg: '#2164f3', text: '#fff' },
  'Glassdoor': { bg: '#0caa41', text: '#fff' },
  'External':  { bg: '#764ba2', text: '#fff' },
  'mock':      { bg: '#667eea', text: '#fff' },
};

// ── Apply Modal ──────────────────────────────────────────────────────────────
const ApplyModal = ({ job, onClose, currentUser }) => {
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '', experience: '', coverLetter: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim())  { setError('Full name is required.'); return; }
    if (!form.email.trim()) { setError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) { setError('Please enter a valid email.'); return; }
    if (!form.experience)   { setError('Please select your experience level.'); return; }

    setLoading(true);
    try {
      const result = await ApiService.applyToJob({
        name: form.name, email: form.email, phone: form.phone,
        experience: form.experience, coverLetter: form.coverLetter,
        jobTitle: job.title, company: job.company,
        location: job.location, salary: job.salary,
        jobId: job._id || job.id,
      });
      setSuccess(result.message || 'Application submitted!');
      if (result.previewUrl) setPreviewUrl(result.previewUrl);
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* apply-modal-overlay: fixed inset-0, dark backdrop, flex center, z-[2000], backdrop-blur */
    <div
      className="fixed inset-0 bg-black/65 flex items-center justify-center z-[2000] p-5 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* apply-modal: white card, rounded-3xl, max-w, max-h, overflow-y-auto, shadow, animate slideUp */}
      <div
        className="bg-white rounded-3xl w-full max-w-[580px] max-h-[90vh] overflow-y-auto shadow-[0_30px_80px_rgba(0,0,0,0.4)] relative animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* apply-modal-close */}
        <button
          className="absolute top-4 right-4 bg-gray-50 border-none text-2xl text-gray-500 cursor-pointer w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 z-10 hover:bg-gray-100 hover:text-gray-700 hover:rotate-90"
          onClick={onClose}
        >×</button>

        {/* apply-modal-header */}
        <div
          className="px-8 pt-7 pb-6 rounded-t-3xl"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
        >
          <h2 className="text-white text-xl font-extrabold m-0 mb-1.5">Apply for {job.title}</h2>
          <p className="text-white/85 text-sm m-0">at <strong>{job.company}</strong> · {job.location}</p>
        </div>

        {success ? (
          /* apply-success-state */
          <div className="px-8 py-10 text-center flex flex-col items-center gap-3">
            <div className="text-[56px]">✅</div>
            <h3 className="text-[22px] font-extrabold text-green-900 m-0">Application Submitted!</h3>
            <p className="text-gray-600 m-0 text-[15px]">{success}</p>
            {previewUrl ? (
              /* apply-preview-box */
              <div className="bg-indigo-50 rounded-xl px-5 py-4 text-center w-full">
                <p className="text-[13px] text-gray-500">📧 View your confirmation email:</p>
                {/* apply-preview-link */}
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 px-6 py-3 text-white font-bold text-sm rounded-xl no-underline transition-all duration-200 shadow-[0_4px_12px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(102,126,234,0.5)]"
                  style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                >📬 View Email</a>
              </div>
            ) : (
              <p className="text-[13px] text-gray-400">Confirmation sent to <strong>{form.email}</strong></p>
            )}
            {/* apply-submit-btn (close button in success state) */}
            <button
              className="w-full py-3.5 text-white text-[15px] font-bold border-none rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
              onClick={onClose}
            >Close</button>
          </div>
        ) : (
          /* apply-form */
          <form className="px-8 py-7 flex flex-col gap-[18px]" onSubmit={handleSubmit}>
            {/* apply-form-row */}
            <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
              {/* apply-form-group */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-700">Full Name *</label>
                <input
                  type="text" name="name" value={form.name} onChange={handleChange}
                  placeholder="Your full name" required disabled={loading}
                  className="px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 transition-all duration-200 font-[inherit] outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-700">Email Address *</label>
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="your@email.com" required disabled={loading}
                  className="px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 transition-all duration-200 font-[inherit] outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                />
              </div>
            </div>

            {/* apply-form-row */}
            <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-700">Phone Number</label>
                <input
                  type="tel" name="phone" value={form.phone} onChange={handleChange}
                  placeholder="+91 98765 43210" disabled={loading}
                  className="px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 transition-all duration-200 font-[inherit] outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-700">Years of Experience *</label>
                <select
                  name="experience" value={form.experience} onChange={handleChange}
                  required disabled={loading}
                  className="px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 transition-all duration-200 font-[inherit] outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                >
                  <option value="">Select experience</option>
                  <option>Fresher (0 years)</option>
                  <option>0-1 years</option>
                  <option>1-2 years</option>
                  <option>2-4 years</option>
                  <option>4-6 years</option>
                  <option>6-10 years</option>
                  <option>10+ years</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">Cover Letter</label>
              <textarea
                name="coverLetter" value={form.coverLetter} onChange={handleChange}
                rows={4} placeholder="Tell us why you're a great fit..." disabled={loading}
                className="px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 transition-all duration-200 font-[inherit] outline-none resize-y min-h-[100px] focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
              />
            </div>

            {/* apply-error */}
            {error && (
              <div className="bg-red-100 text-red-700 px-4 py-3 rounded-[10px] text-[13px] font-medium border-l-4 border-red-400">
                ⚠️ {error}
              </div>
            )}

            {/* apply-submit-btn */}
            <button
              type="submit"
              className="w-full py-3.5 text-white text-[15px] font-bold border-none rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(102,126,234,0.4)] enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_8px_25px_rgba(102,126,234,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  {/* apply-spinner */}
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : '🚀 Submit Application'}
            </button>

            {/* apply-email-note */}
            <p className="text-xs text-gray-400 text-center m-0">
              📧 A confirmation email will be sent upon submission.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

// ── JobCard with Swipe ────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 100; // px needed to trigger swipe action
const SWIPE_ANGLE_LIMIT = 30; // max rotation degrees

export const JobCard = ({ job, onLike, onDislike, currentUser }) => {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [swipeDir, setSwipeDir] = useState(null); // 'left' | 'right' | null
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFlying, setIsFlying] = useState(false);

  const cardRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const sourceStyle = SOURCE_COLORS[job.source] || SOURCE_COLORS['External'];

  const shortDesc = job.description?.slice(0, 120);
  const hasMore = job.description?.length > 120;

  // ── Drag start ──
  const onDragStart = useCallback((clientX, clientY) => {
    startPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  }, []);

  // ── Drag move ──
  const onDragMove = useCallback((clientX, clientY) => {
    if (!isDragging) return;
    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;
    setOffset({ x: dx, y: dy });
    if (dx > 40)       setSwipeDir('right');
    else if (dx < -40) setSwipeDir('left');
    else               setSwipeDir(null);
  }, [isDragging]);

  // ── Drag end ──
  const onDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const dx = offset.x;

    if (dx > SWIPE_THRESHOLD) {
      setIsFlying(true);
      setOffset({ x: 600, y: offset.y });
      setTimeout(() => {
        onLike(job._id || job.id);
        setOffset({ x: 0, y: 0 });
        setSwipeDir(null);
        setIsFlying(false);
      }, 350);
    } else if (dx < -SWIPE_THRESHOLD) {
      setIsFlying(true);
      setOffset({ x: -600, y: offset.y });
      setTimeout(() => {
        onDislike(job._id || job.id);
        setOffset({ x: 0, y: 0 });
        setSwipeDir(null);
        setIsFlying(false);
      }, 350);
    } else {
      setOffset({ x: 0, y: 0 });
      setSwipeDir(null);
    }
  }, [isDragging, offset, job, onLike, onDislike]);

  // ── Mouse events ──
  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('textarea')) return;
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e) => { if (isDragging) onDragMove(e.clientX, e.clientY); };
  const onMouseUp   = ()    => onDragEnd();

  // ── Touch events ──
  const onTouchStart = (e) => {
    const t = e.touches[0];
    onDragStart(t.clientX, t.clientY);
  };
  const onTouchMove = (e) => {
    const t = e.touches[0];
    onDragMove(t.clientX, t.clientY);
  };
  const onTouchEnd = () => onDragEnd();

  // ── Card transform ──
  const rotation = Math.min(Math.max(offset.x / 15, -SWIPE_ANGLE_LIMIT), SWIPE_ANGLE_LIMIT);
  const cardStyle = {
    transform: `translateX(${offset.x}px) translateY(${offset.y * 0.1}px) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : isFlying ? 'transform 0.35s ease' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  const likeOpacity  = Math.min(Math.max(offset.x / SWIPE_THRESHOLD, 0), 1);
  const passOpacity  = Math.min(Math.max(-offset.x / SWIPE_THRESHOLD, 0), 1);


  return (
    <>
      {/* job-card swipeable: relative, gradient bg, rounded-3xl, shadow, p-8, max-w, mx-auto, border, overflow-hidden, will-change-transform, touch-action-pan-y, animate-slide-up */}
      <div
        ref={cardRef}
        className="relative rounded-3xl p-5 max-w-[600px] w-full mx-auto border border-white/80 overflow-hidden will-change-transform touch-pan-y animate-slide-up"
        data-testid="job-card"
        style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Decorative top gradient bar (replaces ::before pseudo-element) */}
        <div
          className="absolute top-0 left-0 right-0 h-[5px]"
          style={{ background: 'linear-gradient(90deg, #667eea 0%, #764ba2 33%, #f093fb 66%, #ff6b6b 100%)' }}
        />

        {/* like-indicator: absolute top-6 left-5, green border+text, rotated -15deg */}
        <div
          className="absolute top-6 left-5 px-5 py-2.5 rounded-xl text-[22px] font-black tracking-[2px] pointer-events-none z-10 border-4 border-green-400 text-green-400 bg-green-400/10 -rotate-[15deg] transition-opacity duration-100"
          style={{ opacity: likeOpacity }}
        >
          ❤️ LIKE
        </div>

        {/* pass-indicator: absolute top-6 right-5, red border+text, rotated 15deg */}
        <div
          className="absolute top-6 right-5 px-5 py-2.5 rounded-xl text-[22px] font-black tracking-[2px] pointer-events-none z-10 border-4 border-red-400 text-red-400 bg-red-400/10 rotate-[15deg] transition-opacity duration-100"
          style={{ opacity: passOpacity }}
        >
          ✕ PASS
        </div>

        {/* job-card-header: flex justify-between items-start mb-4 pb-4 border-b-2 border-gray-100 */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-[#f0f0f5]">
          {/* company-badge: flex items-center gap-4 */}
          <div className="flex items-center gap-4">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="w-12 h-12 rounded-2xl object-contain bg-[#f8f9ff] border border-gray-200 p-1"
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            {/* company-logo: 56x56 gradient circle with initial letter */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-[0_4px_12px_rgba(102,126,234,0.3)]"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: job.companyLogo ? 'none' : 'flex',
              }}
            >
              {job.company.charAt(0).toUpperCase()}
            </div>
            {/* company-info: flex flex-col gap-1 */}
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-gray-900 m-0">{job.company}</h3>
              <span className="text-[13px] text-gray-500 font-medium">{job.jobType || 'Full-time'}</span>
            </div>
          </div>

          {/* job-header-right: flex flex-col items-end gap-1.5 */}
          <div className="flex flex-col items-end gap-1.5">
            {job.source && (
              /* job-source-badge: inline pill with dynamic bg/color */
              <span
                className="px-3 py-[5px] rounded-[20px] text-[11px] font-bold tracking-[0.3px] whitespace-nowrap"
                style={{ background: sourceStyle.bg, color: sourceStyle.text }}
              >
                via {job.source === 'mock' ? 'Naukri' : job.source}
              </span>
            )}
          </div>
        </div>


        {/* job-card-body: mb-4 */}
        <div className="mb-4">
          {/* job-title: gradient text, 28px, bold */}
          <h2
            className="text-[24px] font-bold m-0 mb-3 leading-[1.25] bg-clip-text text-transparent max-sm:text-2xl"
            style={{ backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {job.title}
          </h2>

          {/* job-meta: flex gap-6 mb-5 flex-wrap */}
          <div className="flex gap-3 mb-3 flex-wrap max-sm:gap-3">
            {/* job-meta-item: flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-200 */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-200 max-sm:px-3 max-sm:py-2">
              <span className="text-[18px] max-sm:text-base">📍</span>
              <span className="text-[15px] font-semibold text-gray-700 max-sm:text-sm">{job.location}</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-200 max-sm:px-3 max-sm:py-2">
              <span className="text-[18px] max-sm:text-base">💰</span>
              <span className="text-[15px] font-semibold text-gray-700 max-sm:text-sm">{job.salary}</span>
            </div>
            {job.experience && (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-200 max-sm:px-3 max-sm:py-2">
                <span className="text-base">🧑‍💼</span>
                <span className="text-[15px] font-semibold text-gray-700 max-sm:text-sm">{job.experience}</span>
              </div>
            )}
          </div>

          {/* job-description: mt-5 leading-[1.7] text-gray-600 text-[15px] bg-white p-5 rounded-2xl border border-gray-200 shadow-sm */}
          <div className="mt-3 leading-[1.55] text-gray-600 text-sm bg-white p-4 rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-sm:text-sm max-sm:p-4">
            <p className="m-0">{showFullDesc ? job.description : shortDesc}{hasMore && !showFullDesc && '...'}</p>
            {hasMore && (
              /* read-more-btn */
              <button
                className="bg-transparent border-none text-[#667eea] text-[13px] font-semibold cursor-pointer p-0 pt-1 mt-1 block hover:underline"
                onClick={e => { e.stopPropagation(); setShowFullDesc(!showFullDesc); }}
              >
                {showFullDesc ? 'Show less ▲' : 'Read more ▼'}
              </button>
            )}
          </div>

          {/* job-requirements */}
          {job.requirements?.length > 0 && (
            <div className="mt-3">
              {/* requirements-label */}
              <p className="text-[13px] font-bold text-gray-600 m-0 mb-2">🛠 Required Skills:</p>
              {/* requirements-list */}
              <div className="flex flex-wrap gap-2">
                {job.requirements.map((req, i) => (
                  /* requirement-tag: amber gradient pill */
                  <span
                    key={i}
                    className="px-3 py-1 rounded-[20px] text-xs font-semibold border border-yellow-300 text-yellow-800"
                    style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}
                  >
                    {req}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* job-tags: flex gap-2.5 mt-5 flex-wrap */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {job.tags?.length > 0
              ? job.tags.map((tag, i) => (
                  /* job-tag: indigo/purple gradient pill */
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-[20px] text-xs font-semibold border border-indigo-200 text-indigo-600"
                    style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)' }}
                  >
                    {tag}
                  </span>
                ))
              : (
                <>
                  <span className="px-3 py-1.5 rounded-[20px] text-xs font-semibold border border-indigo-200 text-indigo-600" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)' }}>Full-time</span>
                  <span className="px-3 py-1.5 rounded-[20px] text-xs font-semibold border border-indigo-200 text-indigo-600" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)' }}>India</span>
                </>
              )
            }
          </div>

          {/* btn-apply-now: full-width gradient button */}
          <button
            className="block w-full mt-3 px-6 py-3 text-white text-sm font-bold border-none rounded-[14px] cursor-pointer transition-all duration-[250ms] ease-in-out text-center tracking-[0.3px] shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] active:-translate-y-px focus-visible:outline-[3px] focus-visible:outline-[#667eea] focus-visible:outline-offset-[3px]"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            onClick={e => { e.stopPropagation(); setShowApplyModal(true); }}
          >
            🚀 Apply Now — via TINCLO
          </button>
        </div>

        {/* swipe-hint: flex justify-between pt-3 border-t border-dashed border-gray-200 mt-4 */}
        <div className="flex justify-between pt-2 border-t border-dashed border-gray-200 mt-2">
          {/* swipe-hint-left */}
          <span className="text-[11px] text-red-400 font-medium">← Swipe left to pass</span>
          {/* swipe-hint-right */}
          <span className="text-[11px] text-green-400 font-medium">Swipe right to like →</span>
        </div>
      </div>

      {showApplyModal && (
        <SharedApplyModal job={job} currentUser={currentUser} onClose={() => setShowApplyModal(false)} />
      )}
    </>
  );
};
