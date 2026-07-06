import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

// ── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color = 'text-white' }) => (
  <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
    <p className={`text-lg font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-white/50">{label}</p>
    {sub && <p className="text-[9px] text-white/30 mt-0.5">{sub}</p>}
  </div>
);

// ── Funnel Bar ───────────────────────────────────────────────────────────────
const FunnelBar = ({ stage, max }) => {
  const pct = max ? Math.round((stage.count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-white/60 w-24 text-right">{stage.name}</span>
      <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden relative">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded transition-all duration-700" style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-medium">{stage.count}</span>
      </div>
      <span className="text-[9px] text-white/40 w-10">{stage.conversionRate}%</span>
    </div>
  );
};

// ── Activity Icon ────────────────────────────────────────────────────────────
const activityIcon = (type) => {
  const map = { 'candidate.applied': '📥', 'resume.scored': '📄', 'candidate.shortlisted': '⭐', 'interview.scheduled': '📅', 'interview.completed': '✅', 'assessment.completed': '📝', 'offer.generated': '📨', 'offer.accepted': '🎉', 'offer.rejected': '❌', 'employee.joined': '🏢', 'recruiter.assigned': '👤', 'job.created': '💼', 'job.closed': '🔒' };
  return map[type] || '📌';
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CommandCenterPage() {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [activities, setActivities] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [offers, setOffers] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, liveRes] = await Promise.all([
        ApiService.getCommandDashboard(),
        ApiService.getCommandLive({ limit: 30 }),
      ]);
      setDashboard(dashRes.dashboard || null);
      setActivities(liveRes.activities || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const loadTab = (t) => {
    setTab(t);
    if (t === 'pipeline' && !pipeline) ApiService.getCommandPipeline().then(r => setPipeline(r.pipeline)).catch(console.error);
    if (t === 'recruiters' && !recruiters.length) ApiService.getCommandRecruiters().then(r => setRecruiters(r.recruiters || [])).catch(console.error);
    if (t === 'offers' && !offers) ApiService.getCommandOffers().then(r => setOffers(r.offers)).catch(console.error);
    if (t === 'alerts') ApiService.getCommandAlerts().then(r => setAlerts(r.alerts || [])).catch(console.error);
    if (t === 'forecasts' && !forecasts.length) ApiService.getCommandForecasts().then(r => setForecasts(r.forecasts || [])).catch(console.error);
    if (t === 'analytics' && !analytics) ApiService.getCommandAnalytics().then(r => setAnalytics(r.analytics)).catch(console.error);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0a0a1a,#1a1a3e,#0d0d2b)' }}>
      <div className="w-10 h-10 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );

  const tabs = ['overview', 'live', 'pipeline', 'recruiters', 'offers', 'alerts', 'forecasts', 'analytics'];
  const d = dashboard || {};

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0a0a1a,#1a1a3e,#0d0d2b)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/30 border-b border-cyan-500/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">🎯 Recruitment Command Center</h1>
            <p className="text-xs text-white/40">Enterprise real-time hiring operations</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-[10px] text-green-300">LIVE</span></span>
            {d.activeAlerts > 0 && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">{d.activeAlerts} Alerts</span>}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => loadTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-cyan-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Live Jobs" value={d.liveJobs || 0} color="text-cyan-300" />
              <KpiCard label="Applications Today" value={d.applicationsToday || 0} color="text-green-300" />
              <KpiCard label="Interviews Today" value={d.interviewsToday || 0} color="text-yellow-300" />
              <KpiCard label="Offers Pending" value={d.offersPending || 0} color="text-orange-300" />
              <KpiCard label="Offers Accepted" value={d.offersAccepted || 0} color="text-emerald-300" />
              <KpiCard label="Recruiters Online" value={d.recruitersOnline || 0} color="text-blue-300" />
              <KpiCard label="Success Rate" value={`${d.hiringSuccessRate || 0}%`} color="text-purple-300" />
              <KpiCard label="Avg Time to Hire" value={`${d.avgTimeToHire || 0}d`} color="text-pink-300" />
            </div>

            {/* Recent activity preview */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-white">Live Activity Feed</h3>
                <button onClick={() => loadTab('live')} className="text-[10px] text-cyan-400 hover:underline">View All</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activities.slice(0, 10).map((a, i) => (
                  <div key={a._id || i} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm">{activityIcon(a.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{a.title}</p>
                      <p className="text-[10px] text-white/40">{a.candidateName || a.recruiterName || ''} {a.jobTitle ? `• ${a.jobTitle}` : ''}</p>
                    </div>
                    <span className="text-[9px] text-white/30 whitespace-nowrap">{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
                {activities.length === 0 && <p className="text-xs text-white/40 text-center py-4">No recent activities</p>}
              </div>
            </div>
          </>
        )}

        {/* ── Live Feed ────────────────────────────────────────────────────── */}
        {tab === 'live' && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Real-Time Activity Feed</h3>
            {activities.map((a, i) => (
              <div key={a._id || i} className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10 flex items-start gap-3">
                <span className="text-lg">{activityIcon(a.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">{a.title}</p>
                  {a.description && <p className="text-[10px] text-white/50 mt-0.5">{a.description}</p>}
                  <div className="flex gap-3 mt-1">
                    {a.candidateName && <span className="text-[9px] text-cyan-300">👤 {a.candidateName}</span>}
                    {a.recruiterName && <span className="text-[9px] text-blue-300">🧑‍💼 {a.recruiterName}</span>}
                    {a.jobTitle && <span className="text-[9px] text-white/40">💼 {a.jobTitle}</span>}
                    {a.department && <span className="text-[9px] text-white/40">🏢 {a.department}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] text-white/30">{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  {a.priority === 'critical' && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[8px]">CRITICAL</span>}
                  {a.priority === 'high' && <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[8px]">HIGH</span>}
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="text-xs text-white/50 text-center py-8">No activities recorded yet.</p>}
          </div>
        )}

        {/* ── Pipeline ─────────────────────────────────────────────────────── */}
        {tab === 'pipeline' && pipeline && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Recruitment Pipeline</h3>
            <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 space-y-3">
              {pipeline.stages?.map((s, i) => (
                <FunnelBar key={i} stage={s} max={pipeline.stages[0]?.count || 1} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Avg Time to Hire" value={`${pipeline.avgTimeToHire || 18}d`} color="text-cyan-300" />
              <KpiCard label="Success Rate" value={`${pipeline.hiringSuccessRate || 91}%`} color="text-green-300" />
              <KpiCard label="Offer Accept" value={`${pipeline.offerAcceptRate || 78}%`} color="text-purple-300" />
            </div>
          </div>
        )}
        {tab === 'pipeline' && !pipeline && <p className="text-xs text-white/50 text-center">Loading pipeline...</p>}

        {/* ── Recruiters ───────────────────────────────────────────────────── */}
        {tab === 'recruiters' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Recruiter Performance</h3>
            {recruiters.map((r, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${r.isOnline ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <h4 className="text-sm text-white font-medium">{r.recruiterName || `Recruiter ${i + 1}`}</h4>
                  </div>
                  <span className="text-xs text-cyan-300 font-bold">{r.candidatesHired} hires</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center"><p className="text-xs font-bold text-white">{r.applicationsReviewed}</p><p className="text-[8px] text-white/40">Reviewed</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{r.interviewsConducted}</p><p className="text-[8px] text-white/40">Interviews</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{r.offersGenerated}</p><p className="text-[8px] text-white/40">Offers</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{r.assignedJobs}</p><p className="text-[8px] text-white/40">Jobs</p></div>
                </div>
                {r.pendingReviews > 5 && <p className="text-[9px] text-orange-300 mt-1">⚠️ {r.pendingReviews} pending reviews</p>}
              </div>
            ))}
            {recruiters.length === 0 && <p className="text-xs text-white/50 text-center">No recruiter data yet.</p>}
          </div>
        )}

        {/* ── Offers ───────────────────────────────────────────────────────── */}
        {tab === 'offers' && offers && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Offer Dashboard</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Generated" value={offers.generated} color="text-blue-300" />
              <KpiCard label="Accepted" value={offers.accepted} color="text-green-300" />
              <KpiCard label="Rejected" value={offers.rejected} color="text-red-300" />
              <KpiCard label="Pending" value={offers.pending} color="text-yellow-300" />
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 text-center">
              <p className="text-2xl font-bold text-cyan-300">{offers.acceptRate}%</p>
              <p className="text-xs text-white/50">Offer Accept Rate</p>
            </div>
            {offers.recent?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-white">Recent Offers</h4>
                {offers.recent.slice(0, 8).map((o, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-white">{o.title}</p>
                      <p className="text-[10px] text-white/40">{o.candidateName || o.jobTitle}</p>
                    </div>
                    <span className="text-sm">{activityIcon(o.type)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Alerts ───────────────────────────────────────────────────────── */}
        {tab === 'alerts' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Hiring Alerts</h3>
            {alerts.length > 0 ? alerts.map((a, i) => (
              <div key={a._id || i} className={`bg-white/5 backdrop-blur rounded-xl p-4 border ${a.severity === 'critical' ? 'border-red-500/30' : a.severity === 'warning' ? 'border-yellow-500/30' : 'border-white/10'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                      <h4 className="text-xs text-white font-medium">{a.title}</h4>
                    </div>
                    {a.description && <p className="text-[10px] text-white/50 mt-1 ml-4">{a.description}</p>}
                    <div className="flex gap-2 mt-1 ml-4">
                      {a.department && <span className="text-[9px] text-white/30">{a.department}</span>}
                      {a.jobTitle && <span className="text-[9px] text-white/30">• {a.jobTitle}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {a.status === 'active' && (
                      <button onClick={async () => { await ApiService.updateCommandAlert(a._id, { status: 'acknowledged' }); loadTab('alerts'); }}
                        className="px-2 py-1 rounded bg-white/5 text-[9px] text-white/60 hover:bg-white/10">ACK</button>
                    )}
                    <button onClick={async () => { await ApiService.updateCommandAlert(a._id, { status: 'resolved' }); loadTab('alerts'); }}
                      className="px-2 py-1 rounded bg-green-500/10 text-[9px] text-green-300 hover:bg-green-500/20">Resolve</button>
                  </div>
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-8">No active alerts. All clear.</p>}
          </div>
        )}

        {/* ── Forecasts ────────────────────────────────────────────────────── */}
        {tab === 'forecasts' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Recruitment Forecasts</h3>
            {forecasts.map((f, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm text-white font-medium capitalize">{f.type?.replace(/_/g, ' ')}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${f.confidence === 'high' ? 'bg-green-500/20 text-green-300' : f.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                    {f.confidence} confidence
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center"><p className="text-sm font-bold text-white">{f.currentValue}</p><p className="text-[9px] text-white/40">Current</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-cyan-300">{f.forecastValue}</p><p className="text-[9px] text-white/40">Forecast</p></div>
                  <div className="text-center"><p className={`text-sm font-bold ${f.growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>{f.growthRate > 0 ? '+' : ''}{f.growthRate}%</p><p className="text-[9px] text-white/40">Growth</p></div>
                </div>
                {f.recommendations?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {f.recommendations.map((r, j) => <p key={j} className="text-[10px] text-white/50 flex gap-1"><span className="text-cyan-400">→</span>{r}</p>)}
                  </div>
                )}
              </div>
            ))}
            {forecasts.length === 0 && <p className="text-xs text-white/50">No forecast data.</p>}
            <p className="text-[10px] text-white/30 italic">Forecasts include confidence levels. Predictions are estimates.</p>
          </div>
        )}

        {/* ── Analytics (Executive View) ───────────────────────────────────── */}
        {tab === 'analytics' && analytics && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Executive Analytics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Jobs" value={analytics.totalJobs} color="text-white" />
              <KpiCard label="Open Jobs" value={analytics.openJobs} color="text-cyan-300" />
              <KpiCard label="Hiring Cost" value={analytics.hiringCost} color="text-yellow-300" />
              <KpiCard label="ROI" value={analytics.recruitmentROI} color="text-green-300" />
            </div>

            {/* Monthly trend */}
            {analytics.monthlyTrend?.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-3">Monthly Hires</h4>
                <div className="flex items-end gap-2 h-24">
                  {analytics.monthlyTrend.map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all duration-500"
                        style={{ height: `${(m.hires / Math.max(...analytics.monthlyTrend.map(x => x.hires))) * 100}%` }} />
                      <span className="text-[8px] text-white/40">{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Departments */}
            {analytics.departments?.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Departments</h4>
                <div className="space-y-2">
                  {analytics.departments.map((dept, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs text-white/70">{dept.name}</span>
                      <span className="text-xs text-cyan-300 font-bold">{dept.positions} positions</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'analytics' && !analytics && <p className="text-xs text-white/50 text-center">Loading analytics...</p>}
      </main>
    </div>
  );
}
