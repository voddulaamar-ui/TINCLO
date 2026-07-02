import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/ApiService";

const SignupPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    if (!name) { setError("Full name is required."); return; }
    if (name.length < 2) { setError("Name must be at least 2 characters."); return; }
    if (!/^[a-zA-Z\s'-]+$/.test(name)) { setError("Name can only contain letters, spaces, hyphens and apostrophes."); return; }
    if (!email) { setError("Email address is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters long."); return; }
    if (!/[A-Z]/.test(password)) { setError("Password must contain at least one uppercase letter."); return; }
    if (!/[0-9]/.test(password)) { setError("Password must contain at least one number."); return; }
    setLoading(true);
    try {
      try {
        const data = await ApiService.registerUser({ name, email, password });
        // Store JWT token if returned from backend
        if (data?.token) {
          localStorage.setItem('tinclo_token', data.token);
        }
        if (data?.user) {
          localStorage.setItem('tinclo_current_user', JSON.stringify(data.user));
          setSuccess('✅ Account created successfully! Redirecting...');
          setForm({ name: '', email: '', password: '' });
          setTimeout(() => navigate('/jobs'), 1500);
          return;
        }
      } catch (apiError) {
        if (apiError.message.includes('already exists')) { setError('An account with this email already exists. Please login.'); setLoading(false); return; }
        console.warn('MongoDB save failed, using localStorage fallback:', apiError.message);
      }
      const userId = `user-${email.split('@')[0]}-${Date.now()}`;
      const existingUsers = JSON.parse(localStorage.getItem('tinclo_users') || '[]');
      if (existingUsers.find(u => u.email === email)) { setError('An account with this email already exists. Please login.'); setLoading(false); return; }
      existingUsers.push({ id: userId, name, email, password, createdAt: new Date().toISOString() });
      localStorage.setItem('tinclo_users', JSON.stringify(existingUsers));
      localStorage.setItem('tinclo_current_user', JSON.stringify({ id: userId, name, email }));
      setSuccess('✅ Account created successfully! Redirecting...');
      setForm({ name: '', email: '', password: '' });
      setTimeout(() => navigate('/jobs'), 1500);
    } catch (err) { console.error('Signup error:', err); setError("An error occurred. Please try again.");
    } finally { setLoading(false); }
  };

  const inputCls = "w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl bg-gray-50 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(102,126,234,0.1)] disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 placeholder-gray-400 font-[inherit]";

  return (
    <>
      <div className="h-screen max-h-screen flex items-center justify-center px-4 py-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        {/* Animated blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full -top-[10%] -left-[10%] opacity-30 blur-[80px] animate-[float_20s_infinite_ease-in-out]"
            style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full -bottom-[10%] -right-[10%] opacity-30 blur-[80px] animate-[float_20s_5s_infinite_ease-in-out]"
            style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }} />
          <div className="absolute w-[300px] h-[300px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[80px] animate-[float_20s_10s_infinite_ease-in-out]"
            style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }} />
        </div>

        <div className="relative z-10 flex gap-5 max-w-[1100px] w-full items-center justify-center flex-wrap lg:flex-nowrap">
          {/* Signup Card */}
          <div className="bg-white/[0.98] backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] px-6 py-5 sm:px-8 w-full max-w-[440px] border border-white/30 animate-[slideUp_0.6s_ease-out]">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-[0_10px_30px_rgba(102,126,234,0.3)] animate-[pulse_2s_infinite]"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-br from-indigo-500 to-purple-700 bg-clip-text text-transparent">
                Create Your Account
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">Join thousands of job seekers finding their dream careers</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { id: 'name', type: 'text', label: 'Full Name', placeholder: 'Enter your full name', icon: '👤' },
                { id: 'email', type: 'email', label: 'Email Address', placeholder: 'Enter your email', icon: '✉️' },
                { id: 'password', type: 'password', label: 'Password', placeholder: 'Min 8 chars, 1 uppercase, 1 number', icon: '🔒', minLength: 8 },
              ].map(f => (
                <div key={f.id} className="flex flex-col gap-2">
                  <label htmlFor={f.id} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <span className="text-indigo-500">{f.icon}</span>{f.label}
                  </label>
                  <input type={f.type} id={f.id} name={f.id} placeholder={f.placeholder}
                    value={form[f.id]} onChange={handleChange} disabled={loading} required
                    minLength={f.minLength} className={inputCls} />
                </div>
              ))}

              {error && (
                <div className="flex items-center gap-3 px-5 py-4 bg-red-100 text-red-700 rounded-xl text-sm font-medium border-l-4 border-red-400">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-3 px-5 py-4 bg-green-100 text-green-700 rounded-xl text-sm font-medium border-l-4 border-green-400">
                  ✅ {success}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="relative overflow-hidden w-full py-3.5 text-base font-bold text-white rounded-xl border-none cursor-pointer flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(102,126,234,0.4)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-[0_10px_25px_rgba(102,126,234,0.3)] focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-3"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                {loading ? (
                  <><span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />Creating Your Account...</>
                ) : (
                  <>Sign Up
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12H19M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">Already have an account?{" "}
                <a href="/login" className="text-indigo-500 font-bold hover:text-purple-700 transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-0.5 after:bg-indigo-500 after:transition-all hover:after:w-full">
                  Login here
                </a>
              </p>
              <div className="flex items-center gap-3 my-2 text-gray-300 text-xs">
                <span className="flex-1 h-px bg-gray-200" />or<span className="flex-1 h-px bg-gray-200" />
              </div>
            
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-xs text-gray-600 font-medium">
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Your data is securely encrypted
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="hidden md:block bg-white/[0.95] backdrop-blur-xl rounded-3xl p-7 w-full max-w-[360px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/30 animate-[slideUp_0.6s_0.2s_ease-out_both]">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Join TINCLO?</h3>
            {[
              { icon: '🎯', title: 'Smart Job Matching', desc: 'Swipe through jobs tailored to your skills' },
              { icon: '⚡', title: 'Quick Applications', desc: 'Apply to jobs with just one click' },
              { icon: '💼', title: 'Track Your Progress', desc: 'Manage all your applications in one place' },
            ].map((b, i) => (
              <div key={i} className="flex gap-4 mb-6 last:mb-0 items-start">
                <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-2xl flex-shrink-0 animate-[bounce_2s_infinite]"
                  style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)', animationDelay: `${i * 0.2}s` }}>
                  {b.icon}
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-700 mb-1">{b.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupPage;
