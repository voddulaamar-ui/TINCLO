import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';

// ── Utility: track a job view in localStorage (consumed by other components) ──
export const trackJobView = (jobId) => {
  try {
    const views = JSON.parse(localStorage.getItem('tinclo_job_views') || '[]');
    const today = new Date().toISOString().split('T')[0];
    views.push({ jobId, date: today, ts: Date.now() });
    if (views.length > 500) views.splice(0, views.length - 500);
    localStorage.setItem('tinclo_job_views', JSON.stringify(views));
  } catch (e) { /* ignore */ }
};

// ── SVG bar chart ─────────────────────────────────────────────────────────────
const BarChart = ({ data, labelKey, valueKey, color = '#667eea', height = 140 }) => {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="flex gap-1.5 items-end" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
              {d[valueKey]}
            </div>
            <div className="flex-1 w-full flex items-end bg-gray-100 rounded-t overflow-hidden">
              <div
                className="w-full rounded-t transition-all duration-700 min-h-[3px]"
                style={{ height: `${Math.max(pct, 2)}%`, background: color }}
              />
            </div>
            <div className="text-[10px] text-gray-500 font-semibold truncate w-full text-center">{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── SVG donut chart ───────────────────────────────────────────────────────────
const DonutChart = ({ slices, size = 120, thickness = 18 }) => {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
      {slices.map((sl, i) => {
        const dash = (sl.value / total) * circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={sl.color} strokeWidth={thickness} strokeLinecap="butt"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-white rounded-2xl p-5 text-center shadow-sm border-t-4 hover:-translate-y-0.5 transition-transform" style={{ borderColor: color }}>
    <div className="text-3xl mb-1">{icon}</div>
    <div className="text-3xl font-black leading-none" style={{ color }}>{value}</div>
    <div className="text-xs text-gray-500 font-semibold mt-1">{label}</div>
  </div>
);

// ── Candidate analytics view ──────────────────────────────────────────────────
const CandidateAnalytics = () => {
  const [serverData, setServerData] = useState(null);
  const [tab,        setTab]        = useState('weekly'); // 'weekly' | 'monthly'
  const [loading,    setLoading]    = useState(true);

  // Fallback from localStorage when server is offline
  const buildLocalData = () => {
    const allMatchesRaw = JSON.parse(localStorage.getItem('tinclo_matches') || '{}');
    const currentUser   = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');
    const allMatches    = Array.isArray(allMatchesRaw) ? allMatchesRaw : (allMatchesRaw[currentUser?.id] || []);
    const views         = JSON.parse(localStorage.getItem('tinclo_job_views') || '[]');
    const days          = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today         = new Date();
    const weekly        = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (6 - i));
      const ds = d.toISOString().slice(0, 10);
      return {
        date: ds,
        label: days[d.getDay()],
        count: allMatches.filter(m => m.matchedAt?.slice(0,10) === ds).length + views.filter(v => v.date === ds).length,
      };
    });
    const monthly = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (29 - i));
      const ds = d.toISOString().slice(0, 10);
      return { date: ds, label: ds.slice(5), count: views.filter(v => v.date === ds).length };
    });
    // Count swiped-left from localStorage skipped-jobs store
    const localSwipedLeft = (() => {
      try {
        const all = JSON.parse(localStorage.getItem('tinclo_skipped_jobs') || '{}');
        const uid = currentUser?.id || 'guest';
        return (all[uid] || []).length;
      } catch { return 0; }
    })();
    return {
      totals: {
        jobsViewed:   views.length || allMatches.length * 3,
        swipedRight:  allMatches.length,
        swipedLeft:   localSwipedLeft,
        jobsSaved:    allMatches.filter(m => m.applicationStatus === 'saved').length,
        jobsApplied:  allMatches.filter(m => m.applied).length,
        profileViews: parseInt(localStorage.getItem('tinclo_profile_views') || '8', 10),
      },
      weeklyActivity:  weekly,
      monthlyActivity: monthly,
      applicationsByStatus: allMatches.reduce((acc, m) => {
        const s = m.applicationStatus || 'saved';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {}),
    };
  };

  useEffect(() => {
    ApiService.getCandidateAnalytics()
      .then(d => {
        // Normalize labels
        const norm = arr => (arr || []).map((r, i) => ({
          ...r,
          label: r.date ? (arr.length <= 7
            ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(r.date).getDay()]
            : r.date.slice(5))
            : (r.day || String(i)),
          count: r.count ?? r.jobs ?? 0,
        }));
        setServerData({ ...d, weeklyActivity: norm(d.weeklyActivity), monthlyActivity: norm(d.monthlyActivity) });
      })
      .catch(() => setServerData(buildLocalData()))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const d = serverData || buildLocalData();
  const activityData = tab === 'weekly' ? d.weeklyActivity : d.monthlyActivity;

  // Build donut slices from applicationsByStatus
  const STATUS_COLORS = {
    saved: '#667eea', applied: '#48bb78', under_review: '#3182ce',
    interview_scheduled: '#805ad5', offer: '#38a169', rejected: '#e53e3e',
  };
  const STATUS_LABELS = {
    saved: 'Saved', applied: 'Applied', under_review: 'Under Review',
    interview_scheduled: 'Interview', offer: 'Offer', rejected: 'Rejected',
  };
  const donutSlices = Object.entries(d.applicationsByStatus || {}).map(([status, value]) => ({
    status, value, color: STATUS_COLORS[status] || '#94a3b8', label: STATUS_LABELS[status] || status,
  }));
  const donutTotal = donutSlices.reduce((s, sl) => s + sl.value, 0) || 1;

  if (loading) return (
    <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
      <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      Loading analytics…
    </div>
  );

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-6 gap-4 mb-6 max-xl:grid-cols-3 max-sm:grid-cols-2">
        <StatCard label="Jobs Viewed"   value={d.totals.jobsViewed}              icon="👁️" color="#667eea" />
        <StatCard label="Swiped Right"  value={d.totals.swipedRight}             icon="❤️" color="#48bb78" />
        <StatCard label="Swiped Left"   value={d.totals.swipedLeft   ?? 0}       icon="👎" color="#fc8181" />
        <StatCard label="Saved"         value={d.totals.jobsSaved}               icon="🔖" color="#f6ad55" />
        <StatCard label="Applied"       value={d.totals.jobsApplied}             icon="📧" color="#764ba2" />
        <StatCard label="Profile Views" value={d.totals.profileViews}            icon="👤" color="#3182ce" />
      </div>

      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">

        {/* Activity chart with weekly / monthly toggle */}
        <div className="bg-white rounded-2xl p-6 shadow-sm col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="m-0 text-base font-extrabold text-gray-900">
              {tab === 'weekly' ? '📅 Weekly Activity' : '📆 Monthly Activity'}
            </h2>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {['weekly','monthly'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1 text-xs font-bold cursor-pointer border-none ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {t === 'weekly' ? '7d' : '30d'}
                </button>
              ))}
            </div>
          </div>
          <BarChart data={activityData} labelKey="label" valueKey="count" color="url(#barGrad)" height={150} />
          <svg width="0" height="0"><defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs></svg>
        </div>

        {/* Application status donut */}
        <div className="bg-white rounded-2xl p-6 shadow-sm col-span-1">
          <h2 className="m-0 mb-4 text-base font-extrabold text-gray-900">📊 Applications by Status</h2>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="relative flex-shrink-0">
              <DonutChart slices={donutSlices.length ? donutSlices : [{ value: 1, color: '#e2e8f0' }]} size={130} thickness={20} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-gray-900">{donutTotal}</span>
                <span className="text-[10px] text-gray-400 font-semibold">Total</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {donutSlices.map((sl, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: sl.color }} />
                  <span className="flex-1 text-xs text-gray-600 truncate">{sl.label}</span>
                  <span className="text-xs font-black text-gray-800">{sl.value}</span>
                  <span className="text-[10px] text-gray-400">{Math.round((sl.value / donutTotal) * 100)}%</span>
                </div>
              ))}
              {donutSlices.length === 0 && <p className="text-sm text-gray-400">No applications yet.</p>}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="col-span-2 max-lg:col-span-1 rounded-2xl p-6 shadow-sm bg-page-light dark:bg-page-dark">
          <h2 className="m-0 mb-4 text-base font-extrabold text-gray-900">💡 Job Search Tips</h2>
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
            {[
              { icon: '🎯', tip: 'Apply to at least 5 jobs per day for best results' },
              { icon: '📝', tip: 'Customize your cover letter for each application' },
              { icon: '🔗', tip: 'Connect with recruiters on LinkedIn after applying' },
              { icon: '⏰', tip: 'Follow up on applications after 5–7 business days' },
              { icon: '💼', tip: 'Keep your profile updated with the latest skills' },
              { icon: '🏢', tip: 'Follow companies you love to get instant job alerts' },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 bg-white rounded-xl shadow-sm">
                <span className="text-lg flex-shrink-0">{t.icon}</span>
                <span className="text-xs text-gray-600 leading-snug">{t.tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Recruiter analytics view ──────────────────────────────────────────────────
const RecruiterAnalytics = () => {
  const [d,       setD]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    ApiService.getRecruiterAnalytics()
      .then(setD)
      .catch(e => { if (!e.message?.includes('token') && !e.message?.includes('Session expired') && !e.message?.includes('Unavailable')) setError(e.message || 'Failed to load recruiter analytics'); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
      <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      Loading analytics…
    </div>
  );
  if (error) return <div className="py-10 text-center text-red-500 font-semibold">{error}</div>;
  if (!d)    return null;

  const totals = d.totals || {};
  const skillData = (d.candidateSkillDistribution || []).slice(0, 8);
  const expData   = (d.candidateExperienceDistribution || []);
  const weekData  = (d.applicationsPerWeek || []).map((r, i) => ({
    ...r,
    label: r.date ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(r.date).getDay()] : String(i),
    count: r.count ?? 0,
  }));

  return (
    <div>
      {/* Recruiter stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-lg:grid-cols-2 max-sm:grid-cols-2">
        <StatCard label="Jobs Posted"      value={totals.totalJobsPosted       || 0} icon="💼" color="#667eea" />
        <StatCard label="Applications"     value={totals.applicationsReceived  || 0} icon="📧" color="#48bb78" />
        <StatCard label="Shortlisted"      value={totals.shortlistedCandidates || 0} icon="⭐" color="#f6ad55" />
        <StatCard label="Interviews"       value={totals.interviewsScheduled   || 0} icon="📅" color="#805ad5" />
        <StatCard label="Avg Apps / Job"   value={totals.averageApplicationsPerJob || 0} icon="📊" color="#3182ce" />
        <StatCard label="Active Jobs"      value={totals.activeJobs  || 0} icon="🟢" color="#38a169" />
        <StatCard label="Closed Jobs"      value={totals.closedJobs  || 0} icon="🔒" color="#e53e3e" />
        <StatCard label="Hiring Rate"      value={`${totals.hiringSuccessRate || 0}%`} icon="🏆" color="#d69e2e" />
      </div>

      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">

        {/* Applications per week */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="m-0 mb-5 text-base font-extrabold text-gray-900">📅 Applications This Week</h2>
          <BarChart data={weekData} labelKey="label" valueKey="count" color="#48bb78" height={140} />
        </div>

        {/* Candidate skill distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="m-0 mb-5 text-base font-extrabold text-gray-900">🛠 Candidate Skill Distribution</h2>
          {skillData.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No applicant data yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {skillData.map((s, i) => {
                const max = skillData[0].count || 1;
                const COLORS = ['#667eea','#764ba2','#f093fb','#48bb78','#f6ad55','#fc8181','#3182ce','#38a169'];
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-28 text-xs font-semibold text-gray-600 flex-shrink-0 truncate">{s.skill}</div>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 min-w-[4px]"
                        style={{ width: `${(s.count / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <div className="w-5 text-right text-xs font-black text-gray-700">{s.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Candidate experience distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="m-0 mb-5 text-base font-extrabold text-gray-900">🧑‍💼 Experience Distribution</h2>
          {expData.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No applicant data yet.</p>
          ) : (
            <BarChart
              data={expData.map(e => ({ label: e.experience, count: e.count }))}
              labelKey="label" valueKey="count" color="#805ad5" height={130}
            />
          )}
        </div>

        {/* Top jobs */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="m-0 mb-4 text-base font-extrabold text-gray-900">🏆 Top Performing Jobs</h2>
          <div className="space-y-3">
            {[
              { label: 'Most Viewed',   job: d.mostViewedJob,   icon: '👁', color: '#667eea' },
              { label: 'Most Applied',  job: d.mostAppliedJob,  icon: '📧', color: '#48bb78' },
            ].map(({ label, job, icon, color }) => job ? (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: color + '20', color }}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-gray-400 uppercase">{label}</div>
                  <div className="text-sm font-black text-gray-900 truncate">{job.title}</div>
                  <div className="text-xs text-gray-500">{job.applications} applications</div>
                </div>
              </div>
            ) : null)}
            {!d.mostViewedJob && !d.mostAppliedJob && (
              <p className="text-sm text-gray-400 text-center py-4">Post jobs to see performance data.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// ── Page shell ────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const navigate     = useNavigate();
  const currentUser  = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');
  const isRecruiter  = currentUser?.role === 'recruiter' || currentUser?.role === 'admin';

  if (!currentUser) { navigate('/login'); return null; }

  return (
    <>
      <NavigationLanding />
      <div className="min-h-screen pb-12 pt-16 bg-slate-50">

        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center flex-wrap gap-3"
          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <div>
            <h1 className="text-white text-2xl font-black m-0 mb-1">
              {isRecruiter ? '📊 Recruiter Analytics' : '📈 Your Analytics'}
            </h1>
            <p className="text-white/80 text-sm m-0">
              {isRecruiter ? 'Track job performance and applicant insights' : 'Track your job search progress'}
            </p>
          </div>
          <button
            className="px-5 py-2.5 bg-white/20 text-white border border-white/30 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30"
            onClick={() => navigate(isRecruiter ? '/recruiter' : '/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="px-6 py-6 max-w-7xl mx-auto">
          {isRecruiter ? <RecruiterAnalytics /> : <CandidateAnalytics />}
        </div>
      </div>
    </>
  );
};

export default AnalyticsPage;
