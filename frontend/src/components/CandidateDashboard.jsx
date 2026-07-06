import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';
import SocketService from '../services/SocketService';

const slugify = (value = '') =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, tone = 'indigo', icon }) => {
  const colors = {
    indigo: 'border-indigo-400 text-indigo-600 bg-indigo-50',
    green:  'border-emerald-400 text-emerald-700 bg-emerald-50',
    amber:  'border-amber-400 text-amber-700 bg-amber-50',
    rose:   'border-rose-400 text-rose-700 bg-rose-50',
    sky:    'border-sky-400 text-sky-700 bg-sky-50',
    violet: 'border-violet-400 text-violet-700 bg-violet-50',
  };
  return (
    <div className={`bg-white rounded-xl p-4 border-t-4 shadow-sm hover:-translate-y-0.5 transition-transform ${colors[tone]}`}>
      {icon && <div className="text-2xl mb-1">{icon}</div>}
      <div className="text-2xl font-black leading-none">{value}</div>
      <div className="text-xs font-bold text-gray-500 mt-1">{label}</div>
    </div>
  );
};

// ── Toast banner (for real-time new job alerts) ───────────────────────────────
const Toast = ({ message, onDismiss }) => (
  <div
    className="fixed bottom-5 right-5 z-[900] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-[0_8px_30px_rgba(102,126,234,0.4)] text-white text-sm font-semibold animate-[slideUp_0.3s_ease]"
    style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
  >
    <span>🔥 {message}</span>
    <button onClick={onDismiss} className="bg-white/20 border-none text-white w-6 h-6 rounded-full flex items-center justify-center cursor-pointer text-base leading-none hover:bg-white/30">×</button>
  </div>
);

// ── Interview mode badge ──────────────────────────────────────────────────────
const ModeBadge = ({ mode }) => {
  const cfg = {
    Online:  { bg: 'bg-blue-50 text-blue-700',  label: '🌐 Online' },
    Onsite:  { bg: 'bg-green-50 text-green-700', label: '🏢 Onsite' },
    Hybrid:  { bg: 'bg-violet-50 text-violet-700', label: '🔀 Hybrid' },
  };
  const c = cfg[mode] || cfg.Online;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg}`}>{c.label}</span>;
};

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; }
  }, []);

  const [data,     setData]     = useState(null);
  const [trending, setTrending] = useState([]);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [newJobCount, setNewJobCount] = useState(0);

  // ── Load all dashboard data ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    const load = async () => {
      setLoading(true);
      try {
        const [dashboard, trendingJobs, searches] = await Promise.all([
          ApiService.getCandidateDashboard(),
          ApiService.fetchTrendingJobs(6).catch(() => []),
          ApiService.getSearchHistory().catch(() => []),
        ]);
        setData(dashboard);
        setTrending(Array.isArray(trendingJobs) ? trendingJobs : []);
        setHistory(Array.isArray(searches) ? searches : []);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser, navigate]);

  // ── Socket.IO real-time new job alerts ────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const socket = SocketService.connect(currentUser.id);

    SocketService.onNewJobs(({ newCount, query }) => {
      const count = newCount || 1;
      setNewJobCount(n => n + count);
      const label = query ? `${count} new "${query}" job${count > 1 ? 's' : ''}` : `${count} new job${count > 1 ? 's' : ''} posted!`;
      setToast(label);
      setTimeout(() => setToast(''), 6000);
    });

    SocketService.onJobMatch(({ title, message }) => {
      setToast(title || message || 'New matching jobs available!');
      setTimeout(() => setToast(''), 6000);
    });

    return () => {
      SocketService.offNewJobs();
      SocketService.offJobMatch();
    };
  }, [currentUser]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  if (!currentUser) return null;

  return (
    <>
      <NavigationLanding />
      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}

      <main className="min-h-screen pt-16 pb-12 bg-slate-50">

        {/* ── Welcome header ── */}
        <section className="px-6 py-5 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl overflow-hidden ring-2 ring-indigo-200">
                {data?.user?.profilePicture
                  ? <img src={data.user.profilePicture} alt="" className="w-full h-full object-cover" />
                  : (currentUser.name || 'U').charAt(0)}
              </div>
              <div>
                <h1 className="m-0 text-2xl font-black text-gray-900">
                  {greeting}, {data?.user?.name || currentUser.name} 👋
                </h1>
                <p className="m-0 text-sm text-gray-500">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {newJobCount > 0 && (
                <Link to="/jobs" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold no-underline hover:bg-emerald-700 flex items-center gap-1">
                  🔥 {newJobCount} New Job{newJobCount > 1 ? 's' : ''}
                </Link>
              )}
              <Link to="/jobs" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold no-underline hover:bg-indigo-700">
                Browse Jobs
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="max-w-7xl mx-auto mt-4 mx-6 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm font-semibold">{error}</div>
        )}

        {/* ── Skeleton ── */}
        {loading ? (
          <div className="max-w-7xl mx-auto p-6 grid grid-cols-6 gap-4 max-md:grid-cols-3 max-sm:grid-cols-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto p-6 space-y-6">

            {/* ── Quick stats ── */}
            <div className="grid grid-cols-6 gap-4 max-xl:grid-cols-3 max-sm:grid-cols-2">
              <StatCard label="Matching Jobs"  value={data?.stats?.totalMatchingJobs  || 0} icon="💼" />
              <StatCard label="New Today"      value={data?.stats?.newJobsToday       || 0} icon="🆕" tone="green" />
              <StatCard label="Saved Jobs"     value={data?.stats?.savedJobs          || 0} icon="🔖" tone="amber" />
              <StatCard label="Applied"        value={data?.stats?.appliedJobs        || 0} icon="📧" tone="sky" />
              <StatCard label="Interviews"     value={data?.stats?.interviewsScheduled|| 0} icon="📅" tone="violet" />
              <StatCard label="Profile"        value={`${data?.stats?.profileCompletion || 0}%`} icon="👤" tone="rose" />
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-12 gap-5 max-lg:grid-cols-1">

              {/* Recommended Jobs */}
              <section className="col-span-8 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="m-0 text-lg font-black text-gray-900">🎯 Recommended Jobs</h2>
                  <Link to="/jobs" className="text-sm font-bold text-indigo-600 no-underline hover:underline">View all →</Link>
                </div>
                {(data?.recommendedJobs || []).length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No recommendations yet. Update your profile to get matches.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                    {(data.recommendedJobs).map(job => (
                      <article key={job._id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{job.matchScore || 0}% match</span>
                            <h3 className="m-0 mt-2 text-sm font-black text-gray-900 truncate">{job.title}</h3>
                            <Link to={`/companies/${slugify(job.company)}`} className="text-xs text-indigo-600 font-bold no-underline hover:underline">{job.company}</Link>
                            <p className="m-0 mt-1 text-xs text-gray-500">{job.location} · {job.salary}</p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 text-sm font-black text-gray-500">
                            {job.companyLogo ? <img src={job.companyLogo} alt="" className="w-full h-full object-cover" /> : (job.company?.charAt(0) || '?')}
                          </div>
                        </div>
                        <Link to={`/jobs/${job._id}`} className="mt-3 inline-flex px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold no-underline hover:bg-indigo-700">View Details</Link>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* Profile Completion */}
              <aside className="col-span-4 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="m-0 mb-4 text-lg font-black text-gray-900">👤 Profile Strength</h2>
                <div className="relative w-28 h-28 mx-auto mb-4">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="46" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                    <circle cx="56" cy="56" r="46" fill="none"
                      stroke={data?.profileCompletion?.percent >= 80 ? '#48bb78' : data?.profileCompletion?.percent >= 50 ? '#f6ad55' : '#fc8181'}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 46}`}
                      strokeDashoffset={`${2 * Math.PI * 46 * (1 - (data?.profileCompletion?.percent || 0) / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-900">{data?.profileCompletion?.percent || 0}%</span>
                    <span className="text-[10px] text-gray-400 font-semibold">complete</span>
                  </div>
                </div>
                {(data?.profileCompletion?.missing || []).length > 0 && (
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase mb-2">Missing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.profileCompletion.missing.slice(0, 6).map(item => (
                        <span key={item} className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                <Link to="/profile" className="mt-4 inline-flex w-full justify-center px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-bold no-underline hover:bg-indigo-100">Complete Profile →</Link>
              </aside>

              {/* Upcoming Interviews */}
              <section className="col-span-6 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="m-0 mb-4 text-lg font-black text-gray-900">📅 Upcoming Interviews</h2>
                {(data?.upcomingInterviews || []).length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2 text-gray-400">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm m-0">No interviews scheduled yet.</p>
                    <Link to="/jobs" className="text-xs font-bold text-indigo-600 no-underline hover:underline">Apply to jobs →</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.upcomingInterviews.map((iv, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-violet-50 border border-violet-100">
                        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {iv.company?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="m-0 text-sm font-black text-gray-900 truncate">{iv.position}</p>
                          <p className="m-0 text-xs text-gray-500">{iv.company}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {iv.interviewDate && (
                              <span className="text-xs text-gray-600 font-semibold">
                                🗓 {new Date(iv.interviewDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                {iv.time && ` · ${iv.time}`}
                              </span>
                            )}
                            <ModeBadge mode={iv.mode || 'Online'} />
                          </div>
                        </div>
                        {iv.joinLink && (
                          <a href={iv.joinLink} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-bold text-white bg-violet-600 px-3 py-1.5 rounded-lg no-underline hover:bg-violet-700 flex-shrink-0">
                            Join →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recently Viewed Jobs */}
              <section className="col-span-6 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="m-0 text-lg font-black text-gray-900">👁 Recently Viewed</h2>
                </div>
                {(data?.recentlyViewed || []).length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2 text-gray-400">
                    <span className="text-3xl">🔎</span>
                    <p className="text-sm m-0">Jobs you view will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recentlyViewed.slice(0, 6).map((job, i) => (
                      <Link key={job._id || i} to={`/jobs/${job._id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-indigo-200 no-underline transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 flex-shrink-0">
                          {job.company?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="m-0 text-sm font-bold text-gray-900 truncate">{job.title}</p>
                          <p className="m-0 text-xs text-gray-500 truncate">{job.company} · {job.location}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {job.viewedAt ? new Date(job.viewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Activity */}
              <section className="col-span-4 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="m-0 mb-3 text-lg font-black text-gray-900">⚡ Recent Activity</h2>
                {(data?.recentActivity || []).length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Your activity will appear here.</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentActivity.map((item, i) => (
                      <div key={`activity-${i}`} className="flex items-start gap-2 text-sm text-gray-700 border-b border-gray-100 pb-2 last:border-0">
                        <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Trending Jobs */}
              <section className="col-span-4 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="m-0 mb-3 text-lg font-black text-gray-900">🔥 Trending Jobs</h2>
                {trending.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No trending data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {trending.map(job => (
                      <Link key={job._id} to={`/jobs/${job._id}`}
                        className="block no-underline border border-gray-100 rounded-xl p-3 hover:border-indigo-200 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-black text-gray-900 truncate">{job.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{job.company}</div>
                          </div>
                          <div className="flex flex-col gap-1 items-end flex-shrink-0">
                            {(job.badges || ['New']).slice(0, 1).map(b => (
                              <span key={b} className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                b === 'Trending'     ? 'bg-orange-50 text-orange-600' :
                                b === 'Popular'      ? 'bg-amber-50 text-amber-600'  :
                                b === 'Hiring Fast'  ? 'bg-emerald-50 text-emerald-600' :
                                'bg-gray-50 text-gray-500'
                              }`}>
                                {b === 'Trending' ? '🔥' : b === 'Popular' ? '⭐' : b === 'Hiring Fast' ? '🚀' : '🆕'} {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Following Companies + Search History */}
              <section className="col-span-4 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="m-0 text-base font-black text-gray-900">🏢 Following</h2>
                    <Link to="/companies" className="text-xs font-bold text-indigo-600 no-underline hover:underline">Browse →</Link>
                  </div>
                  {(data?.followingCompanies || []).length === 0 ? (
                    <p className="text-sm text-gray-400 m-0">Follow companies to get job alerts.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {data.followingCompanies.map(c => (
                        <Link key={c._id} to={`/companies/${c.slug || slugify(c.name)}`}
                          className="inline-block px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold no-underline hover:bg-sky-100">
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="m-0 text-base font-black text-gray-900">🔍 Recent Searches</h3>
                    {history.length > 0 && (
                      <button
                        onClick={async () => {
                          await ApiService.clearSearchHistory().catch(() => {});
                          setHistory([]);
                        }}
                        className="text-[11px] font-bold text-red-500 bg-transparent border-none cursor-pointer hover:underline p-0"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-400 m-0">Your searches will appear here.</p>
                  ) : (
                    <div className="space-y-1">
                      {history.slice(0, 5).map(s => (
                        <div key={s._id} className="flex items-center gap-1 group">
                          {/* Reuse: navigate to /jobs with pre-filled search */}
                          <a
                            href={`/jobs?search=${encodeURIComponent(s.query || '')}&location=${encodeURIComponent(s.location || '')}`}
                            className="flex-1 text-sm text-gray-700 no-underline hover:text-indigo-600 flex items-center gap-1 min-w-0"
                          >
                            <span className="text-gray-400 flex-shrink-0">🔍</span>
                            <span className="truncate">{s.query || 'Any role'}{s.location ? ` in ${s.location}` : ''}</span>
                          </a>
                          <button
                            onClick={async () => {
                              await ApiService.deleteSearchHistory(s._id).catch(() => {});
                              setHistory(prev => prev.filter(h => h._id !== s._id));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer p-0 text-base flex-shrink-0 transition-opacity"
                            aria-label="Delete search"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>
        )}
      </main>

      {/* CSS animation for toast */}
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </>
  );
}
