import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationLanding from "./NavigationLanding";

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
      let jwtSuccess = false;
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('tinclo_token', data.token);
          localStorage.setItem('tinclo_current_user', JSON.stringify(data.user));
          setSuccess(`Welcome back, ${data.user.name}! Redirecting...`);
          setForm({ email: '', password: '' });
          const dest = data.user.role === 'admin' ? '/admin' : '/jobs';
          setTimeout(() => navigate(dest), 1000);
          jwtSuccess = true; return;
        }
        console.warn('JWT auth failed, trying localStorage fallback');
      } catch (apiErr) { console.warn('Backend unavailable, using localStorage:', apiErr.message); }
      if (jwtSuccess) return;
      const existingUsers = JSON.parse(localStorage.getItem('tinclo_users') || '[]');
      const user = existingUsers.find(u => u.email === form.email.toLowerCase().trim() && u.password === form.password);
      if (!user) { setError('Invalid email or password. Please try again.'); setLoading(false); return; }
      localStorage.setItem('tinclo_current_user', JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role }));
      const dest = user.role === 'admin' ? '/admin' : '/jobs';
      setSuccess(`Welcome back, ${user.name}! Redirecting...`);
      setForm({ email: '', password: '' });
      setTimeout(() => navigate(dest), 1000);
    } catch (err) { console.error('Login error:', err); setError('An error occurred. Please try again.');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setResetError(""); setResetSuccess("");
    if (!resetEmail) { setResetError("Please enter your email address."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) { setResetError("Please enter a valid email address."); return; }
    // Show a generic success message regardless of whether the account exists
    // This prevents email enumeration attacks and avoids exposing password data
    setResetSuccess("If an account exists with this email, you will receive password reset instructions. Please check your inbox or contact support.");
    setTimeout(() => { setShowForgotPassword(false); setResetEmail(""); setResetSuccess(""); }, 5000);
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false); setResetEmail(""); setResetError(""); setResetSuccess("");
  };

  const inputCls = "w-full px-4 py-3.5 text-base border-2 border-gray-200 rounded-lg bg-gray-50 transition-all duration-300 focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 placeholder-gray-400";

  return (
    <>
      <NavigationLanding />
      <div className="min-h-screen flex items-center justify-center pt-20 px-4 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute w-[600px] h-[600px] rounded-full -top-48 -right-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full -bottom-24 -left-24 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10 w-full max-w-[440px] bg-white rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.3)] px-10 py-12 animate-[slideUp_0.5s_ease-out]">
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Login to continue your job search</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</label>
              <input type="email" id="email" name="email" placeholder="Enter your email"
                value={form.email} onChange={handleChange} disabled={loading} required className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</label>
              <input type="password" id="password" name="password" placeholder="Enter your password"
                value={form.password} onChange={handleChange} disabled={loading} required minLength={6} className={inputCls} />
            </div>

            <div className="text-right -mt-2">
              <button type="button" onClick={() => setShowForgotPassword(true)}
                className="bg-transparent border-none text-indigo-500 text-sm font-semibold cursor-pointer hover:text-purple-700 hover:underline transition-colors">
                Forgot Password?
              </button>
            </div>

            {error && (
              <div className="px-4 py-3.5 bg-red-100 text-red-500 rounded-lg text-sm border-l-4 border-red-400 animate-[shake_0.4s_ease]">
                {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3.5 bg-green-100 text-green-500 rounded-lg text-sm border-l-4 border-green-400">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-4 text-base font-semibold text-white rounded-lg flex items-center justify-center gap-2 mt-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(102,126,234,0.4)] active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Logging in...</>
              ) : "Login"}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <a href="/signup" className="text-purple-800 font-semibold hover:text-purple-700 hover:underline transition-colors">Sign Up</a>
            </p>
            <div className="flex items-center gap-3 my-3.5 text-gray-300 text-xs">
              <span className="flex-1 h-px bg-gray-200" />or<span className="flex-1 h-px bg-gray-200" />
            </div>
            
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 animate-[fadeIn_0.3s_ease]"
            onClick={closeForgotPasswordModal}>
            <div className="bg-white rounded-2xl p-10 w-full max-w-[440px] relative shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[slideUp_0.3s_ease-out]"
              onClick={e => e.stopPropagation()}>
              <button onClick={closeForgotPasswordModal}
                className="absolute top-4 right-4 bg-transparent border-none text-3xl text-gray-500 cursor-pointer w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-all leading-none">
                ×
              </button>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h3>
              <p className="text-sm text-gray-500 mb-8">Enter your email address and we'll help you recover access to your account.</p>
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="reset-email" className="text-sm font-semibold text-gray-700">Email Address</label>
                  <input type="email" id="reset-email" placeholder="Enter your email"
                    value={resetEmail} onChange={e => setResetEmail(e.target.value)} required className={inputCls} />
                </div>
                {resetError && <div className="px-4 py-3.5 bg-red-100 text-red-500 rounded-lg text-sm border-l-4 border-red-400">{resetError}</div>}
                {resetSuccess && (
                  <div className="px-4 py-3.5 bg-green-100 text-green-600 rounded-lg text-sm border-l-4 border-green-400 mb-4">
                    {resetSuccess}<br />
                    <small className="opacity-80">This modal will close in 5 seconds...</small>
                  </div>
                )}
                <button type="submit"
                  className="w-full py-4 text-base font-semibold text-white rounded-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(102,126,234,0.4)]"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  Reset Password
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LoginPage;
