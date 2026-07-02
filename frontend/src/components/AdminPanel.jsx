import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const SAMPLE_APPLICANTS = [
    { id: 1, name: 'Rahul Sharma', email: 'rahul@gmail.com',  role: 'Full Stack Developer', experience: '3 years', status: 'shortlisted', appliedAt: '2025-01-15' },
    { id: 2, name: 'Priya Patel',  email: 'priya@gmail.com',  role: 'Data Scientist',       experience: '4 years', status: 'reviewing',   appliedAt: '2025-01-14' },
    { id: 3, name: 'Amit Kumar',   email: 'amit@gmail.com',   role: 'DevOps Engineer',      experience: '5 years', status: 'hired',       appliedAt: '2025-01-13' },
    { id: 4, name: 'Sneha Reddy',  email: 'sneha@gmail.com',  role: 'UI/UX Designer',       experience: '2 years', status: 'rejected',    appliedAt: '2025-01-12' },
    { id: 5, name: 'Vikram Singh', email: 'vikram@gmail.com', role: 'Product Manager',      experience: '6 years', status: 'reviewing',   appliedAt: '2025-01-11' },
  ];
  const STATUS_CONFIG = {
    reviewing:   { label: 'Reviewing',   color: '#f6ad55', bg: '#fffaf0' },
    shortlisted: { label: 'Shortlisted', color: '#667eea', bg: '#ebf4ff' },
    hired:       { label: 'Hired',       color: '#48bb78', bg: '#f0fff4' },
    rejected:    { label: 'Rejected',    color: '#fc8181', bg: '#fff5f5' },
  };
  const [applicants, setApplicants] = useState(SAMPLE_APPLICANTS);
  const [recruiterSubTab, setRecruiterSubTab] = useState('applicants');
  const [applicantFilter, setApplicantFilter] = useState('all');
  const [showPostJob, setShowPostJob] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', company: '', location: '', salary: '', description: '', experience: '', type: 'Full-time' });
  const [postedJobs, setPostedJobs] = useState([]);
  const [jobSuccess, setJobSuccess] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');
  const isAdmin = currentUser?.role === 'admin' || localStorage.getItem('tinclo_admin_session') === 'true';

  useEffect(() => {
    if (!currentUser || !isAdmin) { navigate('/admin/login'); return; }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
      const token = localStorage.getItem('tinclo_token');
      if (token) {
        try {
          const [dashRes, usersRes, matchesRes] = await Promise.all([
            fetch(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/admin/users`,     { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/admin/matches`,   { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (dashRes.ok && usersRes.ok && matchesRes.ok) {
            const [dash, apiUsers, apiMatches] = await Promise.all([dashRes.json(), usersRes.json(), matchesRes.json()]);
            setUsers(apiUsers); setMatches(apiMatches); setJobs([]);
            setStats({ totalUsers: dash.stats.totalUsers, totalMatches: dash.stats.totalMatches, appliedMatches: dash.stats.appliedMatches, totalJobs: 15, conversionRate: dash.stats.conversionRate });
            return;
          }
        } catch (apiErr) { console.warn('Admin API unavailable, using localStorage:', apiErr.message); }
      }
      const storedUsers   = JSON.parse(localStorage.getItem('tinclo_users')   || '[]');
      const storedMatchesRaw = JSON.parse(localStorage.getItem('tinclo_matches') || '{}');
      // Support both old array format and new per-user object format
      const storedMatches = Array.isArray(storedMatchesRaw)
        ? storedMatchesRaw
        : Object.values(storedMatchesRaw).flat();
      const storedJobs    = JSON.parse(localStorage.getItem('tinclo_jobs')    || '[]');
      setUsers(storedUsers); setMatches(storedMatches); setJobs(storedJobs);
      setStats({ totalUsers: storedUsers.length, totalMatches: storedMatches.length, appliedMatches: storedMatches.filter(m => m.applied).length, totalJobs: storedJobs.length || 15, conversionRate: storedMatches.length > 0 ? ((storedMatches.filter(m => m.applied).length / storedMatches.length) * 100).toFixed(1) : 0 });
    } finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId) => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
    const token = localStorage.getItem('tinclo_token');
    try {
      if (token) {
        await fetch(`${API}/admin/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (err) { console.warn('API delete failed, removing from localStorage only'); }
    const updated = users.filter(u => u._id !== userId && u.id !== userId && u.userId !== userId);
    setUsers(updated); localStorage.setItem('tinclo_users', JSON.stringify(updated));
    setStats(s => ({ ...s, totalUsers: updated.length })); setConfirmDelete(null);
  };

  const handleToggleUserRole = (userId) => {
    const updated = users.map(u => (u._id === userId || u.id === userId || u.userId === userId) ? { ...u, role: u.role === 'admin' ? 'user' : 'admin' } : u);
    setUsers(updated); localStorage.setItem('tinclo_users', JSON.stringify(updated));
  };

  const filteredUsers = users.filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const updateApplicantStatus = (id, status) => setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  const handlePostJob = (e) => {
    e.preventDefault();
    setPostedJobs(prev => [{ ...jobForm, id: Date.now(), postedAt: new Date().toISOString(), applicants: 0 }, ...prev]);
    setJobForm({ title: '', company: '', location: '', salary: '', description: '', experience: '', type: 'Full-time' });
    setShowPostJob(false); setJobSuccess('✅ Job posted successfully!');
    setTimeout(() => setJobSuccess(''), 3000);
  };
  const filteredApplicants = applicantFilter === 'all' ? applicants : applicants.filter(a => a.status === applicantFilter);
  const recruiterStats = { total: applicants.length, reviewing: applicants.filter(a => a.status === 'reviewing').length, shortlisted: applicants.filter(a => a.status === 'shortlisted').length, hired: applicants.filter(a => a.status === 'hired').length };

  const NAV_ITEMS = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'users',     icon: '👥', label: 'User Management' },
    { id: 'jobs',      icon: '💼', label: 'Job Listings' },
    { id: 'matches',   icon: '🎯', label: 'Match Activity' },
    { id: 'recruiter', icon: '🏢', label: 'Recruiter' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
  ];
  const PAGE_TITLES = { dashboard: '📊 Dashboard', users: '👥 User Management', jobs: '💼 Job Listings', matches: '🎯 Match Activity', recruiter: '🏢 Recruiter Dashboard', analytics: '📈 Analytics' };

  if (!currentUser) return null;

  // Shared Tailwind class helpers
  const sectionCls = "bg-white rounded-2xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)] border border-gray-200";
  const thCls = "bg-gray-50 px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide border-b-2 border-gray-200";
  const tdCls = "px-4 py-3.5 border-b border-[#f0f0f5] text-gray-700 align-middle";
  const inputFieldCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-[10px] text-sm outline-none transition-colors font-[inherit] focus:border-indigo-400 resize-y";

  // Stat card color map
  const statColors = { blue: { icon: 'bg-blue-50', value: 'text-blue-600' }, purple: { icon: 'bg-purple-50', value: 'text-purple-700' }, green: { icon: 'bg-green-50', value: 'text-green-600' }, orange: { icon: 'bg-orange-50', value: 'text-orange-600' } };

  const StatCard = ({ icon, value, label, cls }) => (
    <div className="bg-white rounded-2xl p-6 flex items-center gap-4 shadow-[0_4px_15px_rgba(0,0,0,0.06)] border border-gray-200 transition-transform hover:-translate-y-0.5">
      <div className={`text-[32px] w-14 h-14 rounded-2xl flex items-center justify-center ${statColors[cls]?.icon || 'bg-gray-50'}`}>{icon}</div>
      <div>
        <div className={`text-[28px] font-black leading-none ${statColors[cls]?.value || 'text-gray-900'}`}>{value}</div>
        <div className="text-[13px] text-gray-500 font-semibold mt-1">{label}</div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f0f4ff] font-sans">
      {/* Sidebar */}
      <aside className="w-[240px] flex flex-col px-4 py-6 fixed top-0 left-0 bottom-0 z-[100]" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 pb-7 border-b border-white/10 mb-6 text-[28px]">
          <span>💼</span>
          <div>
            <div className="text-xl font-black text-white tracking-wide">TINCLO</div>
            <div className="text-[11px] text-white/50 font-medium">Admin Panel</div>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-none text-sm font-semibold cursor-pointer transition-all text-left ${activeTab === item.id ? 'text-white shadow-[0_4px_12px_rgba(102,126,234,0.4)]' : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white'}`}
              style={activeTab === item.id ? { background: 'linear-gradient(135deg, #667eea, #764ba2)' } : {}}
              onClick={() => setActiveTab(item.id)}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="px-4 py-2.5 bg-white/10 text-white/70 border border-white/15 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all mt-4 hover:bg-white/20 hover:text-white" onClick={() => navigate('/')}>🏠 Home</button>
        <button className="w-full px-4 py-2.5 bg-red-400/15 text-red-400 border border-red-400/30 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all mt-2 hover:bg-red-400/25"
          onClick={() => { localStorage.removeItem('tinclo_admin_session'); localStorage.removeItem('tinclo_current_user'); localStorage.removeItem('tinclo_token'); navigate('/admin/login'); }}>🔓 Logout</button>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-[240px] flex flex-col min-h-screen">
        {/* Topbar */}
        <div className="bg-white px-8 py-5 flex justify-between items-center shadow-[0_2px_10px_rgba(0,0,0,0.06)] sticky top-0 z-50">
          <h1 className="text-[22px] font-extrabold text-gray-900 m-0">{PAGE_TITLES[activeTab]}</h1>
          <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-600">
            <span>👤 {currentUser.name}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>Admin</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-gray-500 p-16">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            <p>Loading data...</p>
          </div>
        ) : (
          <div className="p-8 flex flex-col gap-7">

            {/* Dashboard */}
            {activeTab === 'dashboard' && (<>
              <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2">
                {[{ icon:'👥', value: stats?.totalUsers||0, label:'Registered Users', cls:'blue' }, { icon:'💼', value: stats?.totalJobs||15, label:'Active Job Listings', cls:'purple' }, { icon:'🎯', value: stats?.totalMatches||0, label:'Total Matches', cls:'orange' }, { icon:'✅', value: stats?.appliedMatches||0, label:'Applications Sent', cls:'green' }].map((s,i) => <StatCard key={i} {...s} />)}
              </div>
              <div className={sectionCls}>
                <h2 className="text-lg font-extrabold text-gray-900 m-0 mb-5">Recently Registered Users</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead><tr>{['Name','Email','Role','Joined','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                    <tbody>
                      {users.slice(0,5).map((u,i) => (<tr key={i} className="hover:bg-gray-50">
                        <td className={tdCls}><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>{u.name?.charAt(0).toUpperCase()}</div><strong>{u.name}</strong></div></td>
                        <td className={tdCls}>{u.email}</td>
                        <td className={tdCls}><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.role==='admin'?'bg-yellow-100 text-yellow-800':'bg-indigo-100 text-indigo-700'}`}>{u.role==='admin'?'🛡️ Admin':'👤 User'}</span></td>
                        <td className={tdCls}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td className={tdCls}><span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span></td>
                      </tr>))}
                      {users.length===0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8 italic">No users registered yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={sectionCls}>
                <h2 className="text-lg font-extrabold text-gray-900 m-0 mb-5">Platform Health</h2>
                <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
                  {[{label:'Database'},{label:'API Server'},{label:'Authentication'},{label:'Job Feed'}].map((item,i) => (
                    <div key={i} className="flex flex-col items-center gap-2 p-5 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                      <span className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_8px_#48bb78]" />
                      <span className="text-[13px] font-bold text-gray-700">{item.label}</span>
                      <span className="text-xs font-semibold text-green-500">Operational</span>
                    </div>
                  ))}
                </div>
              </div>
            </>)}

            {/* Users */}
            {activeTab === 'users' && (<>
              <div className={sectionCls}>
                <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                  <h2 className="text-lg font-extrabold text-gray-900 m-0">All Users ({filteredUsers.length})</h2>
                  <input className="px-3.5 py-2 border border-gray-200 rounded-[10px] text-[13px] w-60 outline-none transition-colors focus:border-indigo-400" type="text" placeholder="🔍 Search by name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead><tr>{['User','Email','Phone','Role','Joined','Actions'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredUsers.map((u,i) => (<tr key={i} className="hover:bg-gray-50">
                        <td className={tdCls}><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>{u.name?.charAt(0).toUpperCase()}</div><strong>{u.name}</strong></div></td>
                        <td className={tdCls}>{u.email}</td>
                        <td className={tdCls}>{u.phone||'—'}</td>
                        <td className={tdCls}><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.role==='admin'?'bg-yellow-100 text-yellow-800':'bg-indigo-100 text-indigo-700'}`}>{u.role==='admin'?'🛡️ Admin':'👤 User'}</span></td>
                        <td className={tdCls}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td className={tdCls}><div className="flex gap-2 items-center flex-wrap">
                          <button className="px-3 py-1.5 bg-indigo-100 text-indigo-700 border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-200 whitespace-nowrap" onClick={() => handleToggleUserRole(u._id || u.id || u.userId)}>{u.role==='admin'?'⬇️ Revoke Admin':'⬆️ Make Admin'}</button>
                          <button className="px-3 py-1.5 bg-red-100 text-red-700 border-none rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-red-300 hover:text-white whitespace-nowrap" onClick={() => setConfirmDelete(u._id || u.id || u.userId)}>🗑️ Delete</button>
                        </div></td>
                      </tr>))}
                      {filteredUsers.length===0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8 italic">No users found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              {confirmDelete && (
                <div className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center" onClick={() => setConfirmDelete(null)}>
                  <div className="bg-white rounded-2xl p-8 w-[380px] shadow-[0_20px_60px_rgba(0,0,0,0.2)]" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-extrabold text-gray-900 m-0 mb-3">⚠️ Delete User</h3>
                    <p className="text-sm text-gray-500 m-0 mb-6 leading-relaxed">Are you sure you want to permanently delete this user? This cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                      <button className="px-5 py-2.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-[10px] text-sm font-semibold cursor-pointer hover:bg-gray-200" onClick={() => setConfirmDelete(null)}>Cancel</button>
                      <button className="px-5 py-2.5 bg-red-400 text-white border-none rounded-[10px] text-sm font-bold cursor-pointer hover:bg-red-500" onClick={() => handleDeleteUser(confirmDelete)}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </>)}

            {/* Jobs */}
            {activeTab === 'jobs' && (
              <div className={sectionCls}>
                <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                  <h2 className="text-lg font-extrabold text-gray-900 m-0">Platform Job Listings ({jobs.length||15})</h2>
                  <span className="text-xs text-gray-400 font-medium">Jobs sourced from Naukri, LinkedIn, Indeed, Glassdoor</span>
                </div>
                {jobs.length > 0 ? (
                  <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
                    <thead><tr>{['Title','Company','Location','Type','Source','Status'].map(h=><th key={h} className={thCls}>{h}</th>)}</tr></thead>
                    <tbody>{jobs.map((j,i)=>(<tr key={i} className="hover:bg-gray-50"><td className={tdCls}><strong>{j.title}</strong></td><td className={tdCls}>{j.company}</td><td className={tdCls}>{j.location||'—'}</td><td className={tdCls}>{j.type||'Full-time'}</td><td className={tdCls}><span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-500">{j.source||'Internal'}</span></td><td className={tdCls}><span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Live</span></td></tr>))}</tbody>
                  </table></div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {['Full Stack Developer','Data Scientist','DevOps Engineer','Product Manager','UI/UX Designer','ML Engineer','Backend Developer','React Developer','Cloud Architect','QA Engineer','Android Developer','iOS Developer','Business Analyst','Scrum Master','Security Engineer'].map((title,i) => (
                      <div key={i} className="flex items-center gap-3.5 px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 transition-colors hover:bg-indigo-50">
                        <span className="text-xl">💼</span>
                        <div className="flex-1"><div className="text-sm font-bold text-gray-900">{title}</div><div className="text-xs text-gray-500 mt-0.5">Multiple companies · India</div></div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Live</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Matches */}
            {activeTab === 'matches' && (
              <div className={sectionCls}>
                <h2 className="text-lg font-extrabold text-gray-900 m-0 mb-5">All Match Activity ({matches.length})</h2>
                <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
                  <thead><tr>{['User','Job Title','Company','Status','Date'].map(h=><th key={h} className={thCls}>{h}</th>)}</tr></thead>
                  <tbody>
                    {matches.map((m,i)=>(<tr key={i} className="hover:bg-gray-50"><td className={tdCls}>{m.userId||'—'}</td><td className={tdCls}><strong>{m.job?.title||m.jobTitle||'—'}</strong></td><td className={tdCls}>{m.job?.company||m.company||'—'}</td><td className={tdCls}><span className={`px-3 py-1 rounded-full text-xs font-bold ${m.applied?'bg-green-100 text-green-800':'bg-indigo-100 text-indigo-700'}`}>{m.applied?'✅ Applied':'💾 Saved'}</span></td><td className={tdCls}>{m.matchedAt?new Date(m.matchedAt).toLocaleDateString():'N/A'}</td></tr>))}
                    {matches.length===0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8 italic">No match activity yet</td></tr>}
                  </tbody>
                </table></div>
              </div>
            )}

            {/* Recruiter */}
            {activeTab === 'recruiter' && (
              <div className="flex flex-col gap-5">
                {jobSuccess && <div className="bg-green-100 text-green-800 px-5 py-3 rounded-xl text-sm font-semibold border border-green-300">{jobSuccess}</div>}
                <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2">
                  {[{icon:'👥',value:recruiterStats.total,label:'Total Applicants',cls:'blue'},{icon:'🔍',value:recruiterStats.reviewing,label:'Under Review',cls:'orange'},{icon:'⭐',value:recruiterStats.shortlisted,label:'Shortlisted',cls:'purple'},{icon:'🎉',value:recruiterStats.hired,label:'Hired',cls:'green'}].map((s,i)=><StatCard key={i} {...s} />)}
                </div>
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <div className="flex gap-2">
                    {[{id:'applicants',label:'👥 Applicants'},{id:'jobs',label:'💼 Posted Jobs'}].map(tab=>(
                      <button key={tab.id} className={`px-5 py-2.5 rounded-[10px] border text-[13px] font-semibold cursor-pointer transition-all ${recruiterSubTab===tab.id?'text-white border-transparent shadow-[0_4px_12px_rgba(102,126,234,0.35)]':'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-500'}`}
                        style={recruiterSubTab===tab.id?{background:'linear-gradient(135deg,#667eea,#764ba2)'}:{}} onClick={()=>setRecruiterSubTab(tab.id)}>{tab.label}</button>
                    ))}
                  </div>
                  <button className="px-5 py-2.5 text-white border-none rounded-[10px] text-[13px] font-bold cursor-pointer transition-all whitespace-nowrap hover:opacity-90 hover:-translate-y-px" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}} onClick={()=>setShowPostJob(true)}>+ Post a Job</button>
                </div>
                {recruiterSubTab==='applicants' && (
                  <div className={sectionCls}>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {['all','reviewing','shortlisted','hired','rejected'].map(f=>(
                        <button key={f} className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${applicantFilter===f?'text-white border-transparent':'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-500'}`}
                          style={applicantFilter===f?{background:'linear-gradient(135deg,#667eea,#764ba2)'}:{}} onClick={()=>setApplicantFilter(f)}>
                          {f.charAt(0).toUpperCase()+f.slice(1)} ({f==='all'?applicants.length:applicants.filter(a=>a.status===f).length})
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      {filteredApplicants.map(a=>{const cfg=STATUS_CONFIG[a.status];return(
                        <div key={a.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 transition-colors hover:bg-indigo-50">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>{a.name.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 m-0 mb-0.5">{a.name}</h3>
                            <p className="text-xs text-gray-500 m-0 mb-1.5">{a.email}</p>
                            <div className="flex gap-3 flex-wrap text-xs text-gray-600 font-medium"><span>💼 {a.role}</span><span>🧑‍💼 {a.experience}</span><span>📅 {new Date(a.appliedAt).toLocaleDateString()}</span></div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{color:cfg.color,background:cfg.bg}}>{cfg.label}</span>
                            <div className="flex gap-1.5">
                              <button className="px-3 py-1 rounded-lg border-none text-[11px] font-semibold cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={()=>updateApplicantStatus(a.id,'shortlisted')}>⭐ Shortlist</button>
                              <button className="px-3 py-1 rounded-lg border-none text-[11px] font-semibold cursor-pointer bg-green-100 text-green-800 hover:bg-green-200" onClick={()=>updateApplicantStatus(a.id,'hired')}>✅ Hire</button>
                              <button className="px-3 py-1 rounded-lg border-none text-[11px] font-semibold cursor-pointer bg-red-100 text-red-700 hover:bg-red-300 hover:text-white" onClick={()=>updateApplicantStatus(a.id,'rejected')}>❌ Reject</button>
                            </div>
                          </div>
                        </div>
                      );})}
                      {filteredApplicants.length===0 && <div className="text-center py-10 text-gray-400 text-sm">No applicants in this category</div>}
                    </div>
                  </div>
                )}
                {recruiterSubTab==='jobs' && (
                  <div className={sectionCls}>
                    {postedJobs.length===0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center gap-3">
                        <p>No jobs posted yet.</p>
                        <button className="px-5 py-2.5 text-white border-none rounded-[10px] text-[13px] font-bold cursor-pointer" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}} onClick={()=>setShowPostJob(true)}>+ Post Your First Job</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {postedJobs.map(job=>(
                          <div key={job.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-200 gap-4">
                            <div><h3 className="text-[15px] font-bold text-gray-900 m-0 mb-1">{job.title}</h3><p className="text-[13px] text-gray-500 m-0 mb-1.5">{job.company} · {job.location}</p><div className="flex gap-3 flex-wrap text-xs text-gray-600"><span>💰 {job.salary}</span><span>🧑‍💼 {job.experience}</span><span>⏰ {job.type}</span></div></div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0"><span className="text-[13px] font-bold text-indigo-500">👥 {job.applicants} applicants</span><span className="text-xs text-gray-400">Posted {new Date(job.postedAt).toLocaleDateString()}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {showPostJob && (
                  <div className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center" onClick={()=>setShowPostJob(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[560px] max-w-[calc(100vw-40px)] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.2)] relative" onClick={e=>e.stopPropagation()}>
                      <button className="absolute top-4 right-4 bg-gray-50 border border-gray-200 w-8 h-8 rounded-full text-lg cursor-pointer flex items-center justify-center text-gray-600 hover:bg-gray-200" onClick={()=>setShowPostJob(false)}>×</button>
                      <h2 className="text-xl font-extrabold text-gray-900 m-0 mb-6">📝 Post a New Job</h2>
                      <form onSubmit={handlePostJob} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                          <div className="flex flex-col gap-1.5"><label className="text-[13px] font-semibold text-gray-600">Job Title *</label><input type="text" value={jobForm.title} onChange={e=>setJobForm({...jobForm,title:e.target.value})} placeholder="e.g. Senior React Developer" required className={inputFieldCls} /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-[13px] font-semibold text-gray-600">Company *</label><input type="text" value={jobForm.company} onChange={e=>setJobForm({...jobForm,company:e.target.value})} placeholder="Company name" required className={inputFieldCls} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                          <div className="flex flex-col gap-1.5"><label className="text-[13px] font-semibold text-gray-600">Location *</label><input type="text" value={jobForm.location} onChange={e=>setJobForm({...jobForm,location:e.target.value})} placeholder="e.g. Bengaluru, India" required className={inputFieldCls} /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-[13px] font-semibold text-gray-600">Salary Range</label><input type="text" value={jobForm.salary} onChange={e=>setJobForm({...jobForm,salary:e.target.value})} placeholder="e.g. ₹10L - ₹20L" className={inputFieldCls} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                          <div className="flex flex-col gap-1.5"><label className="text-[13px] font-semibold text-gray-600">Experience</label><input type="text" value={jobForm.experience} onChange={e=>setJobForm({...jobForm,experience:e.target.value})} placeholder="e.g. 2-4 years" className={inputFieldCls} /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-[13px] font-semibold text-gray-600">Job Type</label><select value={jobForm.type} onChange={e=>setJobForm({...jobForm,type:e.target.value})} className={inputFieldCls}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Remote</option><option>Internship</option></select></div>
                        </div>
                        <div className="flex flex-col gap-1.5"><label className="text-[13px] font-semibold text-gray-600">Description *</label><textarea value={jobForm.description} onChange={e=>setJobForm({...jobForm,description:e.target.value})} rows={4} placeholder="Describe the role..." required className={inputFieldCls} /></div>
                        <button type="submit" className="px-5 py-2.5 text-white border-none rounded-[10px] text-[13px] font-bold cursor-pointer hover:opacity-90 hover:-translate-y-px transition-all" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>🚀 Post Job</button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Analytics */}
            {activeTab === 'analytics' && (<>
              <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2">
                {[{icon:'👥',value:users.length,label:'Registered Users',cls:'blue'},{icon:'🎯',value:matches.length,label:'Total Swipes',cls:'purple'},{icon:'📧',value:matches.filter(m=>m.applied).length,label:'Applications Sent',cls:'green'},{icon:'📈',value:`${stats?.conversionRate||0}%`,label:'Conversion Rate',cls:'orange'}].map((s,i)=><StatCard key={i} {...s} />)}
              </div>
              <div className={sectionCls}>
                <h2 className="text-lg font-extrabold text-gray-900 m-0 mb-5">Platform Activity</h2>
                <div className="flex flex-col gap-4">
                  {[{label:'Users Registered',value:users.length,max:Math.max(users.length,10),color:'#667eea'},{label:'Jobs Liked',value:matches.length,max:Math.max(matches.length,10),color:'#764ba2'},{label:'Applications Sent',value:matches.filter(m=>m.applied).length,max:Math.max(matches.length,10),color:'#48bb78'}].map((item,i)=>(
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-[180px] text-[13px] font-semibold text-gray-600 flex-shrink-0">{item.label}</div>
                      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700 min-w-[4px]" style={{width:`${Math.min((item.value/item.max)*100,100)}%`,background:item.color}} /></div>
                      <div className="w-10 text-right text-sm font-extrabold text-gray-700">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={sectionCls}>
                <h2 className="text-lg font-extrabold text-gray-900 m-0 mb-5">Top Job Categories on Platform</h2>
                <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2">
                  {[{name:'Software Developer',count:48},{name:'Data Scientist',count:32},{name:'DevOps Engineer',count:27},{name:'Product Manager',count:21},{name:'UI/UX Designer',count:19},{name:'ML Engineer',count:15}].map((cat,i)=>(
                    <div key={i} className="flex items-center gap-2.5 p-4 rounded-xl border border-indigo-100" style={{background:'linear-gradient(135deg,#f0f4ff,#faf0ff)'}}>
                      <span className="text-xl">💼</span>
                      <span className="flex-1 text-[13px] font-semibold text-gray-700">{cat.name}</span>
                      <span className="text-xs text-indigo-500 font-bold">{cat.count} jobs</span>
                    </div>
                  ))}
                </div>
              </div>
            </>)}

          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
