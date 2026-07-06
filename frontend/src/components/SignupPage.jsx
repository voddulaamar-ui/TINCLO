import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';

const SignupPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const name     = form.name.trim();
    const email    = form.email.trim().toLowerCase();
    const password = form.password;
    const role     = form.role;

    if (!name || name.length < 2)             { setError('Name must be at least 2 characters.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setError('Please enter a valid email.'); return; }
    if (!password || password.length < 8)      { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(password))              { setError('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(password))              { setError('Password must contain at least one number.'); return; }

    setLoading(true);
    try {
      const data = await ApiService.registerUser({ name, email, password, role });
      if (data?.token) localStorage.setItem('tinclo_token', data.token);
      if (data?.user)  localStorage.setItem('tinclo_current_user', JSON.stringify(data.user));
      setSuccess('✅ Account created! Redirecting…');
      setForm({ name: '', email: '', password: '', role: 'user' });
      const dest = data?.user?.role === 'recruiter' ? '/recruiter' : '/jobs';
      setTimeout(() => navigate(dest), 1200);
    } catch (apiErr) {
      if (apiErr.message.includes('already exists')) { setError('An account with this email already exists.'); return; }
      // Offline fallback — store locally
      const users = JSON.parse(localStorage.getItem('tinclo_users') || '[]');
      if (users.find(u => u.email === email)) { setError('An account with this email already exists.'); setLoading(false); return; }
      const userId = `user-${email.split('@')[0]}-${Date.now()}`;
      users.push({ id: userId, name, email, password, role, createdAt: new Date().toISOString() });
      localStorage.setItem('tinclo_users', JSON.stringify(users));
      localStorage.setItem('tinclo_current_user', JSON.stringify({ id: userId, name, email, role }));
      setSuccess('✅ Account created! Redirecting…');
      setForm({ name: '', email: '', password: '', role: 'user' });
      setTimeout(() => navigate(role === 'recruiter' ? '/recruiter' : '/jobs'), 1200);
    } finally { setLoading(false); }
  };

  const inputCls = 'w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl bg-gray-50 transition-all focus:outline-none focus:border-indigo-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(102,126,234,0.1)] disabled:opacity-60 placeholder-gray-400 font-[inherit]';

  return (
    <>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden bg-auth-gradient dark:!bg-[#0f172a]">
        {/* Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full -top-[10%] -left-[10%] opacity-30 blur-[80px] animate-[float_20s_infinite_ease-in-out]" style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full -bottom-[10%] -right-[10%] opacity-30 blur-[80px] animate-[float_20s_5s_infinite_ease-in-out]" style={{ background: 'linear-gradient(135deg,#4facfe,#00f2fe)' }} />
        </div>

        <div className="relative z-10 flex gap-6 max-w-[1100px] w-full items-center justify-center flex-wrap lg:flex-nowrap">
          {/* Sign-up card */}
          <div className="bg-white/[0.98] backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] px-7 py-6 w-full max-w-[460px] border border-white/30">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-[0_10px_30px_rgba(102,126,234,0.3)]"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold mb-1 bg-gradient-to-br from-indigo-500 to-purple-700 bg-clip-text text-transparent">Create Your Account</h2>
              <p className="text-sm text-gray-500">Join thousands of job seekers and recruiters</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><span className="text-indigo-500">👤</span> Full Name</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} required disabled={loading} placeholder="Your full name" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><span className="text-indigo-500">✉️</span> Email Address</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required disabled={loading} placeholder="you@example.com" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><span className="text-indigo-500">🔒</span> Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} required disabled={loading} placeholder="Min 8 chars, 1 uppercase, 1 number" minLength={8} className={inputCls} />
              </div>

              {/* Role selection */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><span className="text-indigo-500">🎭</span> I am a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'user',      icon: '💼', title: 'Job Seeker', desc: 'Find & apply to jobs' },
                    { value: 'recruiter', icon: '🏢', title: 'Recruiter',  desc: 'Post jobs & hire talent' },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-start gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form.role === opt.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-200'}`}>
                      <input type="radio" name="role" value={opt.value} checked={form.role === opt.value} onChange={handleChange} className="mt-0.5 accent-indigo-500" />
                      <div>
                        <p className="text-sm font-bold text-gray-800 m-0">{opt.icon} {opt.title}</p>
                        <p className="text-xs text-gray-500 m-0">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error   && <div className="px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm border-l-4 border-red-400">⚠️ {error}</div>}
              {success && <div className="px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm border-l-4 border-green-400">{success}</div>}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 text-base font-bold text-white rounded-xl border-none cursor-pointer flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(102,126,234,0.4)] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-indigo-500"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</> : 'Create Account →'}
              </button>
            </form>

            <div className="mt-5 text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <a href="/login" className="text-indigo-500 font-bold hover:text-purple-600 transition-colors">Login here</a>
              </p>
            </div>
          </div>

          {/* Benefits panel */}
          <div className="hidden lg:block bg-white/[0.95] backdrop-blur-xl rounded-3xl p-7 w-full max-w-[340px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/30">
            <h3 className="text-xl font-bold text-gray-900 mb-5 text-center">Why Join TINCLO?</h3>
            {[
              { icon: '🎯', title: 'Smart Job Matching', desc: 'Get match scores based on your skills & preferences' },
              { icon: '⚡', title: 'Swipe to Apply',    desc: 'Browse hundreds of jobs with an intuitive swipe interface' },
              { icon: '📊', title: 'Track Applications', desc: 'Follow your applications through every stage' },
              { icon: '🏢', title: 'For Recruiters',    desc: 'Post jobs and manage applicants in one place' },
            ].map((b, i) => (
              <div key={i} className="flex gap-3.5 mb-5 last:mb-0 items-start">
                <div className="text-2xl w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg,rgba(102,126,234,0.1),rgba(118,75,162,0.1))' }}>{b.icon}</div>
                <div><h4 className="text-sm font-bold text-gray-700 mb-0.5 m-0">{b.title}</h4><p className="text-xs text-gray-500 leading-relaxed m-0">{b.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupPage;
