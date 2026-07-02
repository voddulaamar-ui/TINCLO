import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  const [details, setDetails] = useState({ name: '', email: '', phone: '', location: '', bio: '' });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsSuccess, setDetailsSuccess] = useState('');

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');
    if (!user) { navigate('/login'); return; }
    setCurrentUser(user);

    // Try to load profile from backend first, fallback to localStorage
    const loadProfile = async () => {
      try {
        const apiUser = await ApiService.fetchUser(user.id);
        setDetails({
          name: apiUser.name || user.name || '',
          email: apiUser.email || user.email || '',
          phone: apiUser.phone || '',
          location: apiUser.location || '',
          bio: apiUser.bio || '',
        });
      } catch (err) {
        // Fallback to localStorage
        const users = JSON.parse(localStorage.getItem('tinclo_users') || '[]');
        const full = users.find(u => u.id === user.id);
        if (full) {
          setDetails({ name: full.name || '', email: full.email || '', phone: full.phone || '', location: full.location || '', bio: full.bio || '' });
        } else {
          setDetails({ name: user.name || '', email: user.email || '', phone: '', location: '', bio: '' });
        }
      }
    };
    loadProfile();
  }, [navigate]);

  const handleDetailsChange = (e) => setDetails({ ...details, [e.target.name]: e.target.value });

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    setDetailsError(''); setDetailsSuccess('');
    if (!details.name.trim()) { setDetailsError('Name is required.'); return; }
    if (details.name.trim().length < 2) { setDetailsError('Name must be at least 2 characters.'); return; }
    if (!details.email.trim()) { setDetailsError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email)) { setDetailsError('Please enter a valid email.'); return; }
    if (details.phone && !/^[+\d\s\-()]{7,15}$/.test(details.phone)) { setDetailsError('Please enter a valid phone number.'); return; }
    setDetailsLoading(true);
    try {
      try { await ApiService.updateProfile({ email: details.email, name: details.name, phone: details.phone, location: details.location, bio: details.bio }); }
      catch (apiErr) { console.warn('Backend unavailable, saving locally:', apiErr.message); }
      const users = JSON.parse(localStorage.getItem('tinclo_users') || '[]');
      const idx = users.findIndex(u => u.id === currentUser.id);
      if (idx !== -1) { users[idx] = { ...users[idx], ...details }; localStorage.setItem('tinclo_users', JSON.stringify(users)); }
      const updatedUser = { ...currentUser, name: details.name, email: details.email };
      localStorage.setItem('tinclo_current_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setDetailsSuccess('✅ Profile updated successfully!');
    } catch (err) { setDetailsError('Failed to update profile. Please try again.'); }
    finally { setDetailsLoading(false); }
  };

  const handlePassChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setPassError(''); setPassSuccess('');
    if (!passwords.current) { setPassError('Current password is required.'); return; }
    if (!passwords.newPass) { setPassError('New password is required.'); return; }
    if (passwords.newPass.length < 8) { setPassError('New password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(passwords.newPass)) { setPassError('New password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(passwords.newPass)) { setPassError('New password must contain at least one number.'); return; }
    if (passwords.newPass !== passwords.confirm) { setPassError('Passwords do not match.'); return; }
    setPassLoading(true);
    try {
      let apiSuccess = false;
      try {
        await ApiService.changePassword({ email: currentUser.email, currentPassword: passwords.current, newPassword: passwords.newPass });
        apiSuccess = true;
      } catch (apiErr) {
        if (apiErr.message.includes('incorrect') || apiErr.message.includes('401')) { setPassError('Current password is incorrect.'); setPassLoading(false); return; }
        console.warn('Backend unavailable, updating locally:', apiErr.message);
      }
      const users = JSON.parse(localStorage.getItem('tinclo_users') || '[]');
      const idx = users.findIndex(u => u.id === currentUser.id);
      if (idx !== -1) {
        if (!apiSuccess && users[idx].password !== passwords.current) { setPassError('Current password is incorrect.'); setPassLoading(false); return; }
        users[idx].password = passwords.newPass;
        localStorage.setItem('tinclo_users', JSON.stringify(users));
      }
      setPassSuccess('✅ Password changed successfully!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) { setPassError('Failed to update password. Please try again.'); }
    finally { setPassLoading(false); }
  };

  const getStrength = (pass) => {
    if (!pass) return null;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return { label: 'Weak',   color: '#fc8181', bars: 1 };
    if (score === 2) return { label: 'Fair',   color: '#f6ad55', bars: 2 };
    if (score === 3) return { label: 'Good',   color: '#f6ad55', bars: 3 };
    return              { label: 'Strong', color: '#48bb78', bars: 4 };
  };
  const strength = getStrength(passwords.newPass);

  if (!currentUser) return null;

  const initials = currentUser.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const inputCls = "w-full px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 transition-all duration-200 font-[inherit] outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <>
      <NavigationLanding />
      {/* profile-container */}
      <div className="min-h-screen pt-24 px-5 pb-10" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf0ff 50%, #f0fff4 100%)' }}>
        {/* profile-content */}
        <div className="max-w-[1100px] mx-auto flex gap-7 items-start flex-col md:flex-row">

          {/* Sidebar */}
          <div className="w-full md:w-[280px] md:flex-shrink-0">
            <div className="bg-white rounded-3xl px-6 py-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-200">
              {/* Avatar */}
              <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-[32px] font-extrabold text-white mx-auto mb-4 shadow-[0_6px_20px_rgba(102,126,234,0.4)]"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                {initials}
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 m-0 mb-1.5">{currentUser.name}</h2>
              <p className="text-[13px] text-gray-500 m-0 mb-4 break-all">{currentUser.email}</p>
              {/* Badge */}
              <div className="inline-block px-3.5 py-1 rounded-[20px] text-xs font-bold mb-5 text-indigo-600"
                style={{ background: 'linear-gradient(135deg, #e0e7ff, #f3e8ff)' }}>
                💼 Job Seeker
              </div>
              {/* Stats */}
              <div className="flex gap-4 justify-center mb-6 p-4 bg-gray-50 rounded-xl">
                {[
                  { num: (() => { try { const d = JSON.parse(localStorage.getItem('tinclo_matches') || '{}'); const arr = Array.isArray(d) ? d : (d[currentUser.id] || []); return arr.filter(m => m.applied).length; } catch(e){ return 0; } })(), label: 'Applied' },
                  { num: (() => { try { const d = JSON.parse(localStorage.getItem('tinclo_matches') || '{}'); const arr = Array.isArray(d) ? d : (d[currentUser.id] || []); return arr.length; } catch(e){ return 0; } })(), label: 'Matches' },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-[22px] font-extrabold text-indigo-500">{s.num}</span>
                    <span className="text-[11px] text-gray-500 font-semibold">{s.label}</span>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-2.5 bg-gray-50 text-indigo-500 border-2 border-gray-200 rounded-[10px] text-sm font-semibold cursor-pointer transition-all hover:bg-gray-100 hover:border-indigo-400 hover:-translate-y-px"
                onClick={() => navigate('/jobs')}
              >
                ← Back to Jobs
              </button>
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-2 mb-5">
              {[
                { id: 'details',  label: '✏️ Update Details' },
                { id: 'password', label: '🔒 Reset Password' },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={[
                    'px-[22px] py-2.5 rounded-full border-2 text-sm font-semibold cursor-pointer transition-all',
                    activeTab === tab.id
                      ? 'text-white border-transparent shadow-[0_4px_14px_rgba(102,126,234,0.4)]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-400 hover:text-indigo-500',
                  ].join(' ')}
                  style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #667eea, #764ba2)' } : {}}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-200 overflow-hidden animate-slide-up">
              {/* Card header */}
              <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                <h3 className="text-white text-xl font-extrabold m-0 mb-1">
                  {activeTab === 'details' ? 'Personal Information' : 'Change Password'}
                </h3>
                <p className="text-white/80 text-[13px] m-0">
                  {activeTab === 'details' ? 'Update your profile details below' : 'Choose a strong password with at least 8 characters'}
                </p>
              </div>

              {/* Details Tab */}
              {activeTab === 'details' && (
                <form onSubmit={handleUpdateDetails} className="px-8 py-7 flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-700">Full Name *</label>
                      <input type="text" name="name" value={details.name} onChange={handleDetailsChange} placeholder="Your full name" disabled={detailsLoading} required className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-700">Email Address *</label>
                      <input type="email" name="email" value={details.email} onChange={handleDetailsChange} placeholder="your@email.com" disabled={detailsLoading} required className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-700">Phone Number</label>
                      <input type="tel" name="phone" value={details.phone} onChange={handleDetailsChange} placeholder="+91 98765 43210" disabled={detailsLoading} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-700">Location</label>
                      <input type="text" name="location" value={details.location} onChange={handleDetailsChange} placeholder="e.g. Bengaluru, India" disabled={detailsLoading} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-700">Bio / About Me</label>
                    <textarea name="bio" value={details.bio} onChange={handleDetailsChange} rows={3} placeholder="Tell employers about yourself..." disabled={detailsLoading}
                      className={`${inputCls} resize-y min-h-[80px]`} />
                  </div>
                  {detailsError && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-[10px] text-[13px] font-medium border-l-4 border-red-400">⚠️ {detailsError}</div>}
                  {detailsSuccess && <div className="bg-green-100 text-green-800 px-4 py-3 rounded-[10px] text-[13px] font-semibold border-l-4 border-green-400">{detailsSuccess}</div>}
                  <button type="submit" disabled={detailsLoading}
                    className="self-start px-7 py-3 text-white text-[15px] font-bold border-none rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                    {detailsLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : '💾 Save Changes'}
                  </button>
                </form>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <form onSubmit={handleResetPassword} className="px-8 py-7 flex flex-col gap-5">
                  {/* Current password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-700">Current Password *</label>
                    <div className="relative flex items-center">
                      <input type={showCurrent ? 'text' : 'password'} name="current" value={passwords.current} onChange={handlePassChange} placeholder="Enter current password" disabled={passLoading} required className={`${inputCls} pr-11`} />
                      <button type="button" className="absolute right-3 bg-none border-none cursor-pointer text-base p-1 leading-none" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? '🙈' : '👁️'}</button>
                    </div>
                  </div>
                  {/* New password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-700">New Password *</label>
                    <div className="relative flex items-center">
                      <input type={showNew ? 'text' : 'password'} name="newPass" value={passwords.newPass} onChange={handlePassChange} placeholder="Min 8 chars, 1 uppercase, 1 number" disabled={passLoading} required className={`${inputCls} pr-11`} />
                      <button type="button" className="absolute right-3 bg-none border-none cursor-pointer text-base p-1 leading-none" onClick={() => setShowNew(!showNew)}>{showNew ? '🙈' : '👁️'}</button>
                    </div>
                    {strength && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex gap-1 flex-1">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="h-1 flex-1 rounded bg-gray-200 transition-colors duration-300"
                              style={{ background: i <= strength.bars ? strength.color : undefined }} />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold min-w-[44px]" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                  </div>
                  {/* Confirm password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-700">Confirm New Password *</label>
                    <div className="relative flex items-center">
                      <input type={showConfirm ? 'text' : 'password'} name="confirm" value={passwords.confirm} onChange={handlePassChange} placeholder="Re-enter new password" disabled={passLoading} required className={`${inputCls} pr-11`} />
                      <button type="button" className="absolute right-3 bg-none border-none cursor-pointer text-base p-1 leading-none" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? '🙈' : '👁️'}</button>
                    </div>
                    {passwords.confirm && passwords.newPass !== passwords.confirm && <p className="text-xs text-red-500 mt-1">⚠️ Passwords do not match</p>}
                    {passwords.confirm && passwords.newPass === passwords.confirm && passwords.confirm.length > 0 && <p className="text-xs text-green-600 mt-1">✅ Passwords match</p>}
                  </div>
                  {/* Requirements */}
                  <div className="bg-gray-50 rounded-[10px] px-4 py-3.5 text-[13px]">
                    <p className="font-bold text-gray-700 m-0 mb-2">Password must contain:</p>
                    <ul className="list-none p-0 m-0 flex flex-col gap-1">
                      {[
                        { met: passwords.newPass.length >= 8, text: 'At least 8 characters' },
                        { met: /[A-Z]/.test(passwords.newPass), text: 'One uppercase letter' },
                        { met: /[0-9]/.test(passwords.newPass), text: 'One number' },
                      ].map((req, i) => (
                        <li key={i} className={`flex items-center gap-1.5 ${req.met ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className="text-[10px]">{req.met ? '✓' : '○'}</span>{req.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {passError && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-[10px] text-[13px] font-medium border-l-4 border-red-400">⚠️ {passError}</div>}
                  {passSuccess && <div className="bg-green-100 text-green-800 px-4 py-3 rounded-[10px] text-[13px] font-semibold border-l-4 border-green-400">{passSuccess}</div>}
                  <button type="submit" disabled={passLoading}
                    className="self-start px-7 py-3 text-white text-[15px] font-bold border-none rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                    {passLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</> : '🔒 Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
