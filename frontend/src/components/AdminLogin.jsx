import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const data = await ApiService.loginUser({ email: form.email.toLowerCase().trim(), password: form.password });
      if (data?.user?.role !== 'admin') {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }
      localStorage.setItem('tinclo_token', data.token);
      localStorage.setItem('tinclo_current_user', JSON.stringify(data.user));
      localStorage.setItem('tinclo_admin_session', 'true');
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-white/[0.08] border border-white/15 rounded-xl text-white text-sm outline-none transition-all placeholder-white/30 focus:border-indigo-400 focus:bg-indigo-500/10 focus:shadow-[0_0_0_3px_rgba(102,126,234,0.2)] disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      {/* Blobs */}
      <div className="absolute w-[500px] h-[500px] rounded-full -top-24 -right-24 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full -bottom-24 -left-24 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(118,75,162,0.15) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-[420px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-9 py-10 shadow-[0_30px_80px_rgba(0,0,0,0.5)] animate-[slideUp_0.4s_ease]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 text-3xl">
          <span>💼</span>
          <div>
            <div className="text-xl font-black text-white tracking-wide">TINCLO</div>
            <div className="text-[11px] text-white/50 font-semibold uppercase tracking-widest">Admin Portal</div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛡️</div>
          <h2 className="text-white text-2xl font-extrabold m-0 mb-2">Admin Access</h2>
          <p className="text-white/50 text-sm m-0">Restricted area — authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/70 uppercase tracking-wide">Admin Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="admin@tinclo.com" disabled={loading} required className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/70 uppercase tracking-wide">Admin Password</label>
            <div className="relative flex items-center">
              <input type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Enter admin password" disabled={loading} required
                className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 bg-transparent border-none cursor-pointer text-base text-white/50">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-400/15 text-red-400 px-3.5 py-2.5 rounded-lg text-sm border border-red-400/30">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="mt-1 py-3.5 text-white text-base font-bold rounded-xl border-none cursor-pointer flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.5)] disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(102,126,234,0.4)]"
            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
              : '🔐 Login as Admin'}
          </button>
        </form>

        {/* Security notice */}
        <div className="mt-6 p-3.5 bg-white/5 rounded-xl border border-white/[0.08] text-center">
          <p className="text-white/40 text-[11px] uppercase tracking-wide m-0 mb-1.5">Admin access only</p>
        </div>

        <button onClick={() => navigate('/')}
          className="block w-full mt-4 py-2.5 bg-transparent text-white/40 border border-white/10 rounded-xl text-sm cursor-pointer transition-all hover:text-white/70 hover:border-white/20 text-center">
          ← Back to TINCLO
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
