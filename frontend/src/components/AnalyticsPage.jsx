import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';

// Track a job view in localStorage
export const trackJobView = (jobId) => {
  try {
    const views = JSON.parse(localStorage.getItem('tinclo_job_views') || '[]');
    const today = new Date().toISOString().split('T')[0];
    views.push({ jobId, date: today, ts: Date.now() });
    if (views.length > 500) views.splice(0, views.length - 500);
    localStorage.setItem('tinclo_job_views', JSON.stringify(views));
  } catch (e) { /* ignore */ }
};

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');

  const [stats, setStats]           = useState({ liked: 0, applied: 0, viewed: 0, profileViews: 0 });
  const [activityData, setActivity] = useState([]);
  const [categories, setCategories] = useState([]);
  const [donutData, setDonutData]   = useState({ liked: 0, applied: 0, pending: 0 });

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }

    const allMatchesRaw = JSON.parse(localStorage.getItem('tinclo_matches') || '{}');
    // Support both old array format and new per-user object format
    const allMatches = Array.isArray(allMatchesRaw)
      ? allMatchesRaw
      : (allMatchesRaw[currentUser.id] || []);
    const myMatches  = allMatches.filter(m => m.userId === currentUser.id || !m.userId || Array.isArray(allMatchesRaw) === false);
    const liked      = myMatches.length;
    const applied    = myMatches.filter(m => m.applied).length;
    const views      = JSON.parse(localStorage.getItem('tinclo_job_views') || '[]');
    const viewed     = views.length;
    const profileViews = parseInt(localStorage.getItem('tinclo_profile_views') || '8', 10);

    setStats({ liked, applied, viewed: viewed || liked * 3, profileViews });
    setDonutData({ liked, applied, pending: Math.max(0, liked - applied) });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const matchCount = myMatches.filter(m => m.matchedAt && new Date(m.matchedAt).toISOString().split('T')[0] === dateStr).length;
      const viewCount  = views.filter(v => v.date === dateStr).length;
      return { day: days[d.getDay()], jobs: matchCount + viewCount };
    });
    setActivity(weekly);

    const CATEGORY_KEYWORDS = [
      { name: 'Software Developer', keywords: ['developer', 'engineer', 'software', 'full stack', 'backend', 'frontend'] },
      { name: 'Data Scientist',     keywords: ['data scientist', 'data analyst', 'analytics', 'ml engineer', 'machine learning'] },
      { name: 'DevOps Engineer',    keywords: ['devops', 'cloud', 'infrastructure', 'sre', 'platform'] },
      { name: 'Product Manager',    keywords: ['product manager', 'product owner', 'pm '] },
      { name: 'UI/UX Designer',     keywords: ['designer', 'ui/ux', 'ux', 'ui ', 'design'] },
      { name: 'Other',              keywords: [] },
    ];
    const COLORS = ['#667eea', '#764ba2', '#f093fb', '#48bb78', '#f6ad55', '#fc8181'];
    const catCounts = CATEGORY_KEYWORDS.map(cat => ({ name: cat.name, count: 0 }));
    myMatches.forEach(m => {
      const title = (m.job?.title || m.jobTitle || '').toLowerCase();
      let matched = false;
      for (let i = 0; i < CATEGORY_KEYWORDS.length - 1; i++) {
        if (CATEGORY_KEYWORDS[i].keywords.some(kw => title.includes(kw))) { catCounts[i].count++; matched = true; break; }
      }
      if (!matched) catCounts[catCounts.length - 1].count++;
    });
    const nonZero = catCounts.filter(c => c.count > 0);
    const display = nonZero.length >= 3 ? nonZero : [
      { name: 'Software Developer', count: 5 }, { name: 'Data Scientist', count: 3 },
      { name: 'DevOps Engineer', count: 2 },    { name: 'Product Manager', count: 2 },
      { name: 'UI/UX Designer', count: 1 },     { name: 'ML Engineer', count: 2 },
    ];
    setCategories(display.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] })));
  }, []);

  const maxJobs  = Math.max(...activityData.map(d => d.jobs), 1);
  const catTotal = categories.reduce((s, c) => s + c.count, 0) || 1;

  if (!currentUser) return null;

  return (
    <>
      <NavigationLanding />
      <div className="min-h-screen pb-10 pt-16" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf0ff 50%, #f0fff4 100%)' }}>
      {/* Header */}
      <div className="px-8 py-6 flex justify-between items-center" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
        <div>
          <h1 className="text-white text-2xl font-black m-0 mb-1">📈 Your Analytics</h1>
          <p className="text-white/80 text-sm m-0">Track your job search progress</p>
        </div>
        <button
          className="px-5 py-2.5 bg-white/20 text-white border border-white/30 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30"
          onClick={() => navigate('/jobs')}
        >← Back to Jobs</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 px-8 pt-7 max-lg:grid-cols-2 max-sm:grid-cols-2 max-sm:px-4">
        {[
          { label: 'Jobs Viewed',   value: stats.viewed,       icon: '👁️', color: '#667eea' },
          { label: 'Jobs Liked',    value: stats.liked,        icon: '❤️', color: '#764ba2' },
          { label: 'Applications',  value: stats.applied,      icon: '📧', color: '#48bb78' },
          { label: 'Profile Views', value: stats.profileViews, icon: '👤', color: '#f6ad55' },
        ].map((s, i) => (
          <div key={i}
            className="bg-white rounded-2xl p-5 text-center shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-0.5"
            style={{ borderTop: `4px solid ${s.color}` }}
          >
            <div className="text-[28px] mb-2">{s.icon}</div>
            <div className="text-[32px] font-black leading-none" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-5 px-8 py-5 max-lg:grid-cols-1 max-sm:px-4">

        {/* Weekly Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-extrabold text-gray-900 m-0 mb-5">📅 Weekly Activity</h2>
          <div className="flex gap-2 items-end h-[120px]">
            {activityData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                <div className="flex-1 w-full flex items-end bg-gray-50 rounded-md overflow-hidden">
                  <div className="w-full rounded-md min-h-[4px] transition-all duration-500"
                    style={{ height: `${(d.jobs / maxJobs) * 100}%`, background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
                </div>
                <div className="text-[11px] text-gray-500 font-semibold">{d.day}</div>
                <div className="text-[11px] text-indigo-500 font-bold">{d.jobs}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Job Categories */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-extrabold text-gray-900 m-0 mb-5">💼 Jobs by Category</h2>
          <div className="flex flex-col gap-3">
            {categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-[140px] text-xs font-semibold text-gray-600 flex-shrink-0">{cat.name}</div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 min-w-[4px]"
                    style={{ width: `${(cat.count / catTotal) * 100}%`, background: cat.color }} />
                </div>
                <div className="w-6 text-right text-xs font-bold text-gray-700">{cat.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Application Status */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-extrabold text-gray-900 m-0 mb-5">📊 Application Status</h2>
          {/* Donut */}
          <div className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_4px_15px_rgba(0,0,0,0.1)]"
            style={{ background: 'conic-gradient(#667eea 0% 60%, #48bb78 60% 80%, #f6ad55 80% 100%)' }}>
            <div className="absolute w-[70px] h-[70px] bg-white rounded-full" />
            <div className="relative z-10 text-center">
              <div className="text-[22px] font-black text-gray-900">{donutData.liked}</div>
              <div className="text-[11px] text-gray-500">Total</div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Liked / Saved', value: donutData.liked,   color: '#667eea' },
              { label: 'Applied',       value: donutData.applied,  color: '#48bb78' },
              { label: 'Pending',       value: donutData.pending,  color: '#f6ad55' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="flex-1 text-[13px] text-gray-600">{s.label}</span>
                <span className="text-sm font-bold text-gray-700">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-2xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)]" style={{ background: 'linear-gradient(135deg, #f0f4ff, #faf0ff)' }}>
          <h2 className="text-base font-extrabold text-gray-900 m-0 mb-5">💡 Job Search Tips</h2>
          <div className="flex flex-col gap-3">
            {[
              { icon: '🎯', tip: 'Apply to at least 5 jobs per day for best results' },
              { icon: '📝', tip: 'Customize your cover letter for each application' },
              { icon: '🔗', tip: 'Connect with recruiters on LinkedIn after applying' },
              { icon: '⏰', tip: 'Follow up on applications after 5-7 business days' },
              { icon: '💼', tip: 'Keep your profile updated with latest skills' },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 bg-white rounded-[10px] shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
                <span className="text-lg flex-shrink-0">{t.icon}</span>
                <span className="text-[13px] text-gray-600 leading-snug">{t.tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default AnalyticsPage;
