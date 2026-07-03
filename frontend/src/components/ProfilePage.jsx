import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';
import { profileCompleteness } from '../services/MatchingService';

const DOMAINS = [
  'Full Stack', 'Frontend', 'Backend', 'Data Science', 'Machine Learning',
  'DevOps', 'Cloud', 'Mobile', 'UI/UX Design', 'Product Management',
  'Cybersecurity', 'Blockchain', 'QA / Testing', 'Data Engineering', 'Other',
];

const inputCls = 'w-full px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 transition-all duration-200 font-[inherit] outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] disabled:opacity-60 disabled:cursor-not-allowed';

// ── Reusable tag-input ──────────────────────────────────────────────────────
const TagInput = ({ tags = [], onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const add = (val) => {
    const v = val.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  };
  const remove = (t) => onChange(tags.filter(x => x !== t));
  return (
    <div className="flex flex-wrap gap-1.5 p-2 border-2 border-gray-200 rounded-[10px] bg-gray-50 focus-within:border-indigo-400 focus-within:bg-white min-h-[46px] cursor-text"
      onClick={() => document.getElementById(`tag-${placeholder}`)?.focus()}>
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-indigo-700 border border-indigo-200"
          style={{ background: 'linear-gradient(135deg,#e0e7ff,#f3e8ff)' }}>
          {t}
          <button type="button" className="text-indigo-400 hover:text-red-500 leading-none bg-transparent border-none cursor-pointer" onClick={() => remove(t)}>×</button>
        </span>
      ))}
      <input id={`tag-${placeholder}`} value={input} placeholder={tags.length ? '' : placeholder}
        className="border-none outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400 min-w-[120px] flex-1"
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (['Enter', ',', 'Tab'].includes(e.key)) { e.preventDefault(); add(input); } }}
        onBlur={() => { if (input.trim()) add(input); }} />
    </div>
  );
};

// ── Section card ─────────────────────────────────────────────────────────────
const Section = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <h3 className="text-base font-bold text-gray-800 m-0">{title}</h3>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

export default function ProfilePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser]   = useState(null);
  const [activeTab, setActiveTab]       = useState('profile');
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState({ type: '', text: '' });
  const [completeness, setCompleteness] = useState(0);

  // ── Form state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '', email: '', phone: '', location: '', bio: '',
    skills: [], domain: '', experienceYears: '', preferredLocations: [],
    expectedSalary: '', linkedin: '', github: '',
    profilePicture: '', resumeUrl: '',
    education: [], projects: [],
  });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [passMsg, setPassMsg]     = useState({ type: '', text: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [showPws, setShowPws]     = useState({ current: false, newPass: false, confirm: false });

  // ── Load profile ────────────────────────────────────────────────────────
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');
    if (!user) { navigate('/login'); return; }
    setCurrentUser(user);

    ApiService.getMe().then(u => {
      const f = {
        name: u.name || '', email: u.email || '', phone: u.phone || '',
        location: u.location || '', bio: u.bio || '',
        skills: u.skills || [], domain: u.domain || '',
        experienceYears: u.experienceYears || '',
        preferredLocations: u.preferredLocations || [],
        expectedSalary: u.expectedSalary || '',
        linkedin: u.linkedin || '', github: u.github || '',
        profilePicture: u.profilePicture || '', resumeUrl: u.resumeUrl || '',
        education: u.education || [], projects: u.projects || [],
      };
      setForm(f);
      setCompleteness(profileCompleteness(u));
    }).catch(() => {
      setForm(f => ({ ...f, name: user.name || '', email: user.email || '' }));
    });
  }, [navigate]); // eslint-disable-line

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Education helpers ───────────────────────────────────────────────────
  const addEdu = () => setForm(p => ({ ...p, education: [...p.education, { degree: '', institution: '', year: '' }] }));
  const setEdu = (i, k, v) => setForm(p => { const e = [...p.education]; e[i] = { ...e[i], [k]: v }; return { ...p, education: e }; });
  const removeEdu = (i) => setForm(p => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));

  // ── Project helpers ─────────────────────────────────────────────────────
  const addProj = () => setForm(p => ({ ...p, projects: [...p.projects, { name: '', description: '', url: '' }] }));
  const setProj = (i, k, v) => setForm(p => { const pr = [...p.projects]; pr[i] = { ...pr[i], [k]: v }; return { ...p, projects: pr }; });
  const removeProj = (i) => setForm(p => ({ ...p, projects: p.projects.filter((_, idx) => idx !== i) }));

  // ── Save profile ────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveMsg({ type: '', text: '' });
    try {
      const updated = await ApiService.updateCandidateProfile(form);
      const merged = { ...currentUser, name: updated.user.name, email: updated.user.email };
      localStorage.setItem('tinclo_current_user', JSON.stringify(merged));
      setCurrentUser(merged);
      setCompleteness(profileCompleteness(updated.user));
      setSaveMsg({ type: 'success', text: '✅ Profile saved successfully!' });
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg({ type: '', text: '' }), 4000);
    }
  };

  // ── Change password ─────────────────────────────────────────────────────
  const handlePassChange = async (e) => {
    e.preventDefault();
    setPassMsg({ type: '', text: '' });
    if (passwords.newPass !== passwords.confirm) { setPassMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (passwords.newPass.length < 8) { setPassMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    setPassLoading(true);
    try {
      await ApiService.changePassword({ email: currentUser.email, currentPassword: passwords.current, newPassword: passwords.newPass });
      setPassMsg({ type: 'success', text: '✅ Password changed successfully!' });
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      setPassMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPassLoading(false);
      setTimeout(() => setPassMsg({ type: '', text: '' }), 4000);
    }
  };

  if (!currentUser) return null;

  const initials = currentUser.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const completenessColor = completeness >= 80 ? '#48bb78' : completeness >= 50 ? '#f6ad55' : '#fc8181';

  const tabs = [
    { id: 'profile',   label: '👤 Profile' },
    { id: 'skills',    label: '🛠 Skills & Preferences' },
    { id: 'education', label: '🎓 Education & Projects' },
    { id: 'password',  label: '🔒 Password' },
  ];

  return (
    <>
      <NavigationLanding />
      <div className="min-h-screen pt-20 px-4 pb-12" style={{ background: 'linear-gradient(135deg,#f0f4ff 0%,#faf0ff 50%,#f0fff4 100%)' }}>
        <div className="max-w-[1100px] mx-auto flex gap-6 items-start flex-col md:flex-row">

          {/* ── Sidebar ── */}
          <div className="w-full md:w-[270px] flex-shrink-0 flex flex-col gap-4">
            {/* Avatar card */}
            <div className="bg-white rounded-2xl px-5 py-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-200">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold text-white mx-auto mb-3 shadow-[0_4px_14px_rgba(102,126,234,0.4)]"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                {initials}
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 m-0 mb-0.5">{currentUser.name}</h2>
              <p className="text-xs text-gray-500 m-0 mb-3 break-all">{currentUser.email}</p>
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold text-white mb-4 capitalize`}
                style={{ background: currentUser.role === 'recruiter' ? '#38a169' : 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                {currentUser.role === 'recruiter' ? '🏢 Recruiter' : '💼 Job Seeker'}
              </span>

              {/* Completeness ring */}
              <div className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-xl">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Profile Strength</div>
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke={completenessColor} strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - completeness / 100)}`}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black" style={{ color: completenessColor }}>{completeness}%</div>
                </div>
                {completeness < 80 && <p className="text-[11px] text-gray-400 text-center m-0">Complete your profile to get better matches</p>}
              </div>

              <button className="w-full mt-4 py-2 text-sm font-semibold text-indigo-600 border-2 border-gray-200 rounded-[10px] bg-gray-50 hover:bg-gray-100 hover:border-indigo-300 cursor-pointer transition-all"
                onClick={() => navigate('/jobs')}>← Back to Jobs</button>
            </div>

            {/* Tab nav */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-200 overflow-hidden">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`w-full text-left px-5 py-3 text-sm font-semibold border-none cursor-pointer transition-all border-b border-gray-100 last:border-b-0 ${activeTab === t.id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 bg-white hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Main ── */}
          <div className="flex-1 min-w-0">
            {/* Save message */}
            {saveMsg.text && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold border-l-4 ${saveMsg.type === 'success' ? 'bg-green-50 text-green-800 border-green-400' : 'bg-red-50 text-red-700 border-red-400'}`}>
                {saveMsg.text}
              </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-5">

              {/* ── Profile tab ── */}
              {activeTab === 'profile' && (
                <>
                  <Section title="Personal Information" icon="👤">
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Full Name *</label>
                        <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} required className={inputCls} placeholder="Your full name" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Email</label>
                        <input type="email" value={form.email} disabled className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Phone</label>
                        <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Location</label>
                        <input type="text" value={form.location} onChange={e => setField('location', e.target.value)} className={inputCls} placeholder="e.g. Bengaluru, India" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-4">
                      <label className="text-[13px] font-bold text-gray-700">Bio</label>
                      <textarea rows={3} value={form.bio} onChange={e => setField('bio', e.target.value)} className={`${inputCls} resize-y min-h-[70px]`} placeholder="Tell employers about yourself..." />
                    </div>
                  </Section>

                  <Section title="Social Links & Media" icon="🔗">
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">LinkedIn URL</label>
                        <input type="url" value={form.linkedin} onChange={e => setField('linkedin', e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/..." />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">GitHub URL</label>
                        <input type="url" value={form.github} onChange={e => setField('github', e.target.value)} className={inputCls} placeholder="https://github.com/..." />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Profile Picture URL</label>
                        <input type="url" value={form.profilePicture} onChange={e => setField('profilePicture', e.target.value)} className={inputCls} placeholder="https://example.com/photo.jpg" />
                        {form.profilePicture && (
                          <img src={form.profilePicture} alt="Preview" className="mt-1 w-14 h-14 rounded-full object-cover border-2 border-indigo-200 shadow-sm" onError={e => { e.target.style.display = 'none'; }} />
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Resume URL</label>
                        <input type="url" value={form.resumeUrl} onChange={e => setField('resumeUrl', e.target.value)} className={inputCls} placeholder="https://drive.google.com/..." />
                        {form.resumeUrl && (
                          <a href={form.resumeUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1">
                            📄 View Resume ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 m-0">
                      💡 Use Google Drive, Dropbox, or any public URL for your resume. Recruiters will see this.
                    </p>
                  </Section>
                </>
              )}

              {/* ── Skills & Preferences tab ── */}
              {activeTab === 'skills' && (
                <>
                  <Section title="Skills" icon="🛠">
                    <p className="text-xs text-gray-500 mb-3 m-0">Type a skill and press Enter or comma to add</p>
                    <TagInput tags={form.skills} onChange={v => setField('skills', v)} placeholder="e.g. React, Node.js, Python" />
                  </Section>

                  <Section title="Domain & Experience" icon="🎯">
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Preferred Domain</label>
                        <select value={form.domain} onChange={e => setField('domain', e.target.value)} className={inputCls}>
                          <option value="">Select domain...</option>
                          {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Years of Experience</label>
                        <input type="number" min="0" max="50" value={form.experienceYears} onChange={e => setField('experienceYears', e.target.value)} className={inputCls} placeholder="e.g. 3" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">Expected Salary</label>
                        <input type="text" value={form.expectedSalary} onChange={e => setField('expectedSalary', e.target.value)} className={inputCls} placeholder="e.g. ₹10L - ₹15L" />
                      </div>
                    </div>
                  </Section>

                  <Section title="Preferred Locations" icon="📍">
                    <p className="text-xs text-gray-500 mb-3 m-0">Add cities or "Remote" — used for job matching</p>
                    <TagInput tags={form.preferredLocations} onChange={v => setField('preferredLocations', v)} placeholder="e.g. Bengaluru, Remote, Hyderabad" />
                  </Section>
                </>
              )}

              {/* ── Education & Projects tab ── */}
              {activeTab === 'education' && (
                <>
                  <Section title="Education" icon="🎓">
                    <div className="flex flex-col gap-4">
                      {form.education.map((edu, i) => (
                        <div key={i} className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 max-sm:grid-cols-1">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[12px] font-bold text-gray-600">Degree</label>
                            <input value={edu.degree} onChange={e => setEdu(i, 'degree', e.target.value)} className={inputCls} placeholder="e.g. B.Tech CSE" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[12px] font-bold text-gray-600">Institution</label>
                            <input value={edu.institution} onChange={e => setEdu(i, 'institution', e.target.value)} className={inputCls} placeholder="University / College" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[12px] font-bold text-gray-600">Year</label>
                            <div className="flex gap-2">
                              <input value={edu.year} onChange={e => setEdu(i, 'year', e.target.value)} className={inputCls} placeholder="2023" />
                              <button type="button" onClick={() => removeEdu(i)} className="px-3 py-2 bg-red-50 text-red-500 border border-red-200 rounded-[10px] text-sm cursor-pointer hover:bg-red-100 flex-shrink-0">✕</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addEdu} className="self-start px-4 py-2 text-sm font-semibold text-indigo-600 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-all">+ Add Education</button>
                    </div>
                  </Section>

                  <Section title="Projects" icon="💡">
                    <div className="flex flex-col gap-4">
                      {form.projects.map((p, i) => (
                        <div key={i} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex gap-3">
                            <div className="flex-1 flex flex-col gap-1.5">
                              <label className="text-[12px] font-bold text-gray-600">Project Name</label>
                              <input value={p.name} onChange={e => setProj(i, 'name', e.target.value)} className={inputCls} placeholder="Project title" />
                            </div>
                            <div className="flex-1 flex flex-col gap-1.5">
                              <label className="text-[12px] font-bold text-gray-600">URL</label>
                              <div className="flex gap-2">
                                <input value={p.url} onChange={e => setProj(i, 'url', e.target.value)} className={inputCls} placeholder="https://..." />
                                <button type="button" onClick={() => removeProj(i)} className="px-3 py-2 bg-red-50 text-red-500 border border-red-200 rounded-[10px] text-sm cursor-pointer hover:bg-red-100 flex-shrink-0">✕</button>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[12px] font-bold text-gray-600">Description</label>
                            <textarea rows={2} value={p.description} onChange={e => setProj(i, 'description', e.target.value)} className={`${inputCls} resize-none`} placeholder="Brief description..." />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addProj} className="self-start px-4 py-2 text-sm font-semibold text-indigo-600 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-all">+ Add Project</button>
                    </div>
                  </Section>
                </>
              )}

              {/* Save button (not for password tab) */}
              {activeTab !== 'password' && (
                <button type="submit" disabled={saving}
                  className="self-start px-8 py-3 text-white text-sm font-bold border-none rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                  {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : '💾 Save Profile'}
                </button>
              )}
            </form>

            {/* ── Password tab ── */}
            {activeTab === 'password' && (
              <form onSubmit={handlePassChange} className="flex flex-col gap-5">
                <Section title="Change Password" icon="🔒">
                  <div className="flex flex-col gap-4">
                    {[
                      { key: 'current', label: 'Current Password' },
                      { key: 'newPass', label: 'New Password' },
                      { key: 'confirm', label: 'Confirm New Password' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-gray-700">{label}</label>
                        <div className="relative flex items-center">
                          <input type={showPws[key] ? 'text' : 'password'} value={passwords[key]}
                            onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                            className={`${inputCls} pr-11`} placeholder="••••••••" required />
                          <button type="button" className="absolute right-3 border-none bg-transparent cursor-pointer text-base text-gray-400"
                            onClick={() => setShowPws(p => ({ ...p, [key]: !p[key] }))}>
                            {showPws[key] ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {passMsg.text && (
                      <div className={`px-4 py-3 rounded-[10px] text-[13px] font-medium border-l-4 ${passMsg.type === 'success' ? 'bg-green-50 text-green-800 border-green-400' : 'bg-red-50 text-red-700 border-red-400'}`}>
                        {passMsg.text}
                      </div>
                    )}
                  </div>
                </Section>
                <button type="submit" disabled={passLoading}
                  className="self-start px-8 py-3 text-white text-sm font-bold border-none rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                  {passLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</> : '🔒 Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
