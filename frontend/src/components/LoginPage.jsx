import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationLanding from "./NavigationLanding";
import ApiService from "../services/ApiService";

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

  // Determine where to send user based on role
  const getDestination = (role) => {
    if (role === 'admin')     return '/admin';
    if (role === 'recruiter') return '/recruiter';
    return '/jobs';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Please enter a valid email address."); return; }
    setLoading(true);

    try {
      // Try backend JWT auth first
      try {
        const data = await ApiService.loginUser({ email: form.email, password: form.password });
        localStorage.setItem('tinclo_token', data.token);
        localStorage.setItem('tinclo_current_user', JSON.stringify(data.user));
        setSuccess(`Welcome back, ${data.user.name}! Redirecting...`);
        setForm({ email: '', password: '' });
        setTimeout(() => navigate(getDestination(data.user.role)), 1000);
        return;
      } catch (apiErr) {
        // If it's an auth error (wrong creds), show it and stop
        if (apiErr.message?.toLowerCase().includes('invalid') || apiErr.message?.toLowerCase().includes('password') || apiErr.message?.toLowerCase().includes('not found')) {
          setError(apiErr.message || 'Invalid email or password.');
          return;
        }
        // Otherwise backend is just offline — fall through to localStorage
        console.warn('Backend unavailable, trying localStorage:', apiErr.message);
      }

      // Offline localStorage fallback
      const existingUsers = JSON.parse(localStorage.getItem('tinclo_users') || '[]');
      const user = existingUsers.find(u => u.email === form.email.toLowerCase().trim() && u.password === form.password);
      if (!user) { setError('Invalid email or password. Please try again.'); return; }
      localStorage.setItem('tinclo_current_user', JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role || 'user' }));
      setSuccess(`Welcome back, ${user.name}! Redirecting...`);
      setForm({ email: '', password: '' });
      setTimeout(() => navigate(getDestination(user.role)), 1000);

    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setResetError(""); setResetSuccess("");
    if (!resetEmail) { setResetError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) { setResetError("Please enter a valid email address."); return; }
    setResetSuccess("If an account exists with this email, you will receive password reset instructions. Please check your inbox or contact support.");
    setTimeout(() => { setShowForgotPassword(false); setResetEmail(""); setResetSuccess(""); }, 5000);
  };

  const inputCls = "w-full px-4 py-3.5 text-base border-2 border-gray-200 rounded-lg bg-gray-50 transition-all duration-300 focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 placeholder-gray-400";

  return (
    <>
      <NavigationLanding />
      <div className="min-h-screen flex items-center justify-center pt-20 px-4 pb-8 relative overflow-hidden bg-auth-gradient dark:!bg-[#0f172a]">
        <div className="absolute w-[600px] h-[600px] rounded-full -top-48 -right-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full -bottom-24 -left-24 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10 w-full max-w-[440px] dark:!bg-[#1e293b] bg-white rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.3)] px-10 py-12">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">💼</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Login to continue your journey</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            <div className="text-right -mt-1">
              <button type="button" onClick={() => setShowForgotPassword(true)}
                className="bg-transparent border-none text-indigo-500 text-sm font-semibold cursor-pointer hover:text-purple-700 hover:underline transition-colors">
                Forgot Password?
              </button>
            </div>

            {error && <div className="px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm border-l-4 border-red-400">⚠️ {error}</div>}
            {success && <div className="px-4 py-3 bg-green-50 text-green-600 rounded-lg text-sm border-l-4 border-green-400">{success}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-4 text-base font-semibold text-white rounded-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(102,126,234,0.4)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Logging in...</> : "Login →"}
            </button>
          </form>

          <div className="mt-6 text-center pt-5 border-t border-gray-200 flex flex-col gap-2">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <a href="/signup" className="text-indigo-600 font-semibold hover:text-purple-700 hover:underline transition-colors">Sign Up</a>
            </p>
            <p className="text-sm text-gray-500">
              Are you a recruiter?{" "}
              <a href="/signup" className="text-green-600 font-semibold hover:text-green-700 hover:underline transition-colors">Register here →</a>
            </p>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4"
            onClick={() => setShowForgotPassword(false)}>
            <div className="bg-white rounded-2xl p-8 w-full max-w-[420px] relative shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowForgotPassword(false)}
                className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-400 cursor-pointer hover:text-gray-700">×</button>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h3>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll help you recover access.</p>
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <input type="email" placeholder="Enter your email" value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)} required className={inputCls} />
                {resetError && <div className="px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm border-l-4 border-red-400">{resetError}</div>}
                {resetSuccess && (
                  <div className="px-4 py-3 bg-green-50 text-green-700 rounded-lg text-sm border-l-4 border-green-400">
                    {resetSuccess}<br /><small className="opacity-70">Closing in 5 seconds…</small>
                  </div>
                )}
                <button type="submit"
                  className="w-full py-3.5 text-base font-semibold text-white rounded-lg transition-all hover:-translate-y-0.5 border-none cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  Send Reset Instructions
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
