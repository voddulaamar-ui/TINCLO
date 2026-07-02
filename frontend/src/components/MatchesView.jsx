// MatchesView Component - Displays all matched jobs with in-app apply modal

import React, { useState } from 'react';
import ApiService from '../services/ApiService';
import SharedApplyModal from './ApplyModal';

const SOURCE_CONFIG = {
  'Naukri':    { color: '#ff6b35', label: 'Naukri' },
  'LinkedIn':  { color: '#0077b5', label: 'LinkedIn' },
  'Indeed':    { color: '#2164f3', label: 'Indeed' },
  'Glassdoor': { color: '#0caa41', label: 'Glassdoor' },
  'Direct':    { color: '#764ba2', label: 'Company Site' },
};

const getConfig = (job) => {
  if (job.source && SOURCE_CONFIG[job.source]) return SOURCE_CONFIG[job.source];
  if (job.applyUrl) {
    if (job.applyUrl.includes('linkedin.com'))  return SOURCE_CONFIG['LinkedIn'];
    if (job.applyUrl.includes('indeed.com'))    return SOURCE_CONFIG['Indeed'];
    if (job.applyUrl.includes('glassdoor'))     return SOURCE_CONFIG['Glassdoor'];
    if (job.applyUrl.includes('naukri.com'))    return SOURCE_CONFIG['Naukri'];
  }
  return SOURCE_CONFIG['Naukri'];
};

// ── In-app Apply Modal ──
const ApplyModal = ({ job, onClose, currentUser, onApply }) => {
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    experience: '',
    coverLetter: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    if (!form.email.trim()) { setError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    if (!form.experience) { setError('Please select your experience level.'); return; }

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
      if (onApply) onApply(job.id || job._id);
      if (result.previewUrl) setPreviewUrl(result.previewUrl);
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* apply-modal-overlay */
    <div
      className="fixed inset-0 bg-black/65 flex items-center justify-center z-[2000] p-5 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* apply-modal */}
      <div
        className="bg-white rounded-3xl w-full max-w-[580px] max-h-[90vh] overflow-y-auto shadow-[0_30px_80px_rgba(0,0,0,0.4)] relative animate-slide-up"
        onClick={(e) => e.stopPropagation()}
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
            {/* apply-success-icon */}
            <div className="text-[56px]">✅</div>
            <h3 className="text-[22px] font-extrabold text-green-900 m-0">Application Submitted!</h3>
            <p className="text-gray-600 m-0 text-[15px]">{success}</p>
            {previewUrl ? (
              /* apply-preview-box */
              <div className="bg-indigo-50 rounded-xl px-5 py-4 text-center w-full">
                <p className="text-[13px] text-gray-500 m-0">📧 Click to view your confirmation email:</p>
                {/* apply-preview-link */}
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 px-6 py-3 text-white font-bold text-sm rounded-xl no-underline transition-all duration-200 shadow-[0_4px_12px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(102,126,234,0.5)]"
                  style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                >📬 View Confirmation Email</a>
              </div>
            ) : (
              /* apply-success-note */
              <p className="text-[13px] text-gray-400 m-0">Confirmation sent to <strong>{form.email}</strong></p>
            )}
            {/* apply-submit-btn (close) */}
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
                  <option value="Fresher (0 years)">Fresher (0 years)</option>
                  <option value="0-1 years">0-1 years</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="2-4 years">2-4 years</option>
                  <option value="4-6 years">4-6 years</option>
                  <option value="6-10 years">6-10 years</option>
                  <option value="10+ years">10+ years</option>
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
              ) : '🚀 Apply Now — via TINCLO'}
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

// ── Main MatchesView ──
export const MatchesView = ({ matches, onApply, onUndoApply, onNavigateToBrowser, currentUser }) => {
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [applyJob, setApplyJob] = useState(null);

  if (matches.length === 0) {
    return (
      /* matches-empty */
      <div className="flex items-center justify-center min-h-[400px] p-5" data-testid="empty-matches">
        {/* empty-card */}
        <div className="bg-white rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1)] p-12 text-center max-w-[500px] flex flex-col items-center">
          <h2 className="text-[32px] font-bold m-0 mb-4 text-gray-800">No Matches Yet</h2>
          <p className="text-lg text-gray-500 m-0 mb-8">Start browsing jobs and like the ones you're interested in!</p>
          <button
            className="py-3.5 px-8 text-base font-semibold text-white border-none rounded-xl cursor-pointer transition-all shadow-[0_4px_12px_rgba(102,126,234,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(102,126,234,0.45)]"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            onClick={onNavigateToBrowser}
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  const selectedMatch = selectedMatchId
    ? matches.find(m => (m.job.id || m.job._id) === selectedMatchId)
    : null;

  return (
    /* matches-view */
    <div className="px-6 py-6 max-w-[1000px] mx-auto">
      {/* matches-header */}
      <div
        className="mb-7 px-7 py-6 rounded-2xl text-white shadow-[0_8px_25px_rgba(102,126,234,0.4)]"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <h2 className="text-[28px] font-extrabold text-white m-0">Your Matches ({matches.length})</h2>
      </div>

      {/* matches-list */}
      <div className="grid gap-4 mb-6">
        {matches.map((match) => {
          const jobId = match.job.id || match.job._id;
          const cfg = getConfig(match.job);
          const isSelected = selectedMatchId === jobId;

          return (
            /* match-item */
            <div
              key={jobId}
              className={[
                'bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] px-6 py-5 flex justify-between items-center cursor-pointer transition-all duration-[250ms] border-2 relative overflow-hidden',
                'hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5',
                isSelected
                  ? 'border-[#667eea] shadow-[0_8px_30px_rgba(102,126,234,0.2)]'
                  : 'border-transparent hover:border-indigo-100',
                'max-sm:flex-col max-sm:gap-3',
              ].join(' ')}
              onClick={() => setSelectedMatchId(prev => prev === jobId ? null : jobId)}
              data-testid="match-item"
            >
              {/* Left border strip — replaces ::before pseudo-element */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
              />

              {/* match-left */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0 pl-1">
                {/* match-company-logo */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.15)]"
                  style={{ background: `linear-gradient(135deg, ${cfg.color}, #764ba2)` }}
                >
                  {match.job.company.charAt(0).toUpperCase()}
                </div>

                {/* match-info */}
                <div className="flex-1 min-w-0">
                  {/* match-title-row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* match-title */}
                    <h3 className="text-xl font-semibold text-gray-800 m-0">{match.job.title}</h3>
                    {/* match-source-badge */}
                    <span
                      className="text-white text-[10px] font-bold px-2 py-0.5 rounded-[10px] whitespace-nowrap"
                      style={{ background: cfg.color }}
                    >{cfg.label}</span>
                  </div>
                  {/* match-company */}
                  <p className="text-base text-gray-500 m-0 mt-0.5">{match.job.company}</p>
                  {/* match-location */}
                  <p className="text-sm text-gray-400 m-0 mt-0.5">📍 {match.job.location}</p>
                  {/* match-salary */}
                  {match.job.salary && (
                    <p className="text-[13px] text-green-500 font-semibold m-0 mt-0.5">💰 {match.job.salary}</p>
                  )}
                  {/* match-tags */}
                  {match.job.tags?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                      {match.job.tags.slice(0, 3).map((tag, i) => (
                        /* match-tag */
                        <span
                          key={i}
                          className="text-indigo-600 px-2.5 py-0.5 rounded-xl text-[11px] font-semibold border border-indigo-200"
                          style={{ background: 'linear-gradient(135deg, #e0e7ff, #f3e8ff)' }}
                        >{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* match-actions */}
              <div
                className="flex flex-col items-end gap-2 ml-4 flex-shrink-0 max-sm:ml-0 max-sm:flex-row max-sm:flex-wrap max-sm:w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {match.applied ? (
                  /* match-status-badge applied */
                  <div className="px-4 py-2 rounded-[20px] text-[13px] font-bold whitespace-nowrap bg-green-100 text-green-800 border border-green-300">
                    ✅ Applied
                  </div>
                ) : (
                  /* match-apply-now-btn */
                  <button
                    className="block px-[22px] py-3 text-white text-sm font-bold border-none rounded-[14px] cursor-pointer whitespace-nowrap transition-all duration-[250ms] shadow-[0_4px_14px_rgba(102,126,234,0.4)] text-center tracking-[0.3px] hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] active:-translate-y-px"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    onClick={(e) => { e.stopPropagation(); setApplyJob(match.job); }}
                    aria-label={`Apply for ${match.job.title}`}
                  >
                    🚀 Apply Now — via TINCLO
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedMatch && (() => {
        const cfg = getConfig(selectedMatch.job);
        return (
          /* match-details */
          <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.1)] p-6 mt-6" data-testid="match-details">
            {/* detail-header */}
            <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b-2 border-gray-100 flex-wrap">
              <div>
                {/* detail-header h3 */}
                <h3 className="text-[22px] font-bold text-gray-800 m-0 mb-1">{selectedMatch.job.title}</h3>
                {/* detail-company */}
                <p className="text-lg text-gray-500 m-0">{selectedMatch.job.company}</p>
              </div>
              {/* match-apply-now-btn in detail header */}
              <button
                className="flex-shrink-0 block px-[22px] py-3 text-white text-sm font-bold border-none rounded-[14px] cursor-pointer whitespace-nowrap transition-all duration-[250ms] shadow-[0_4px_14px_rgba(102,126,234,0.4)] text-center tracking-[0.3px] hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] active:-translate-y-px"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                onClick={() => setApplyJob(selectedMatch.job)}
              >
                🚀 Apply Now — via TINCLO
              </button>
            </div>

            <div>
              {/* detail-info */}
              <div className="flex gap-6 mb-4 text-sm flex-wrap">
                <span><strong>📍 Location:</strong> {selectedMatch.job.location}</span>
                <span><strong>💰 Salary:</strong> {selectedMatch.job.salary}</span>
              </div>

              {/* detail-tags */}
              {selectedMatch.job.tags?.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {selectedMatch.job.tags.map((tag, i) => (
                    /* match-tag */
                    <span
                      key={i}
                      className="text-indigo-600 px-2.5 py-0.5 rounded-xl text-[11px] font-semibold border border-indigo-200"
                      style={{ background: 'linear-gradient(135deg, #e0e7ff, #f3e8ff)' }}
                    >{tag}</span>
                  ))}
                </div>
              )}

              {/* detail-description */}
              <div className="mt-4 leading-relaxed">
                <strong>Description:</strong>
                <p className="mt-2 text-gray-600 m-0">{selectedMatch.job.description}</p>
              </div>

              {/* detail-meta */}
              <div className="mt-5 pt-4 border-t border-gray-100 text-gray-400">
                <small>Matched on: {new Date(selectedMatch.matchedAt).toLocaleDateString()}</small>
              </div>
            </div>
          </div>
        );
      })()}

      {/* In-app Apply Modal */}
      {applyJob && (
        <SharedApplyModal
          job={applyJob}
          currentUser={currentUser}
          onClose={() => setApplyJob(null)}
          onApply={(jobId) => {
            const match = matches.find(m => (m.job.id || m.job._id) === jobId);
            if (match) onApply(match.id);
          }}
        />
      )}
    </div>
  );
};
