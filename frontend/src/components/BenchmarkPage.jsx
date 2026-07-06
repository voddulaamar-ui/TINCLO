import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

// ── Comparison Bar ───────────────────────────────────────────────────────────
const CompBar = ({ label, yours, industryAvg, top10, lowerIsBetter, unit = '' }) => {
  const max = Math.max(yours, industryAvg, top10 || industryAvg) * 1.2 || 1;
  const yourPct = (yours / max) * 100;
  const indPct = (industryAvg / max) * 100;
  const isGood = lowerIsBetter ? yours <= industryAvg : yours >= industryAvg;
  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white font-medium">{label}</span>
        <span className={`text-xs font-bold ${isGood ? 'text-green-400' : 'text-orange-400'}`}>{unit}{yours}{unit === '₹' ? '' : unit === '' ? '' : ''}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/40 w-14">You</span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${isGood ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${yourPct}%` }} />
          </div>
          <span className="text-[9px] text-white/50 w-12 text-right">{yours}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/40 w-14">Industry</span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${indPct}%` }} />
          </div>
          <span className="text-[9px] text-white/50 w-12 text-right">{industryAvg}</span>
        </div>
      </div>
    </div>
  );
};

// ── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, label, size = 90, color = '#06b6d4' }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} className="transition-all duration-700" />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-sm font-bold">{score}%</text>
      </svg>
      <span className="text-[10px] text-white/50 text-center">{label}</span>
    </div>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────
export default function BenchmarkPage() {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [recruitment, setRecruitment] = useState([]);
  const [salary, setSalary] = useState(null);
  const [skills, setSkills] = useState([]);
  const [learning, setLearning] = useState([]);
  const [workforce, setWorkforce] = useState([]);
  const [productivity, setProductivity] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.getBenchmarkDashboard();
      setDashboard(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const loadTab = (t) => {
    setTab(t);
    if (t === 'recruitment' && !recruitment.length) ApiService.getBenchmarkRecruitment().then(r => setRecruitment(r.metrics || [])).catch(console.error);
    if (t === 'salary' && !salary) ApiService.getBenchmarkSalary().then(r => setSalary(r)).catch(console.error);
    if (t === 'skills' && !skills.length) ApiService.getBenchmarkSkills().then(r => setSkills(r.skills || [])).catch(console.error);
    if (t === 'learning' && !learning.length) ApiService.getBenchmarkLearning().then(r => setLearning(r.metrics || [])).catch(console.error);
    if (t === 'workforce' && !workforce.length) ApiService.getBenchmarkWorkforce().then(r => setWorkforce(r.metrics || [])).catch(console.error);
    if (t === 'productivity' && !productivity.length) ApiService.getBenchmarkProductivity().then(r => setProductivity(r.metrics || [])).catch(console.error);
    if (t === 'alerts') ApiService.getBenchmarkAlerts().then(r => setAlerts(r.alerts || [])).catch(console.error);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0a1628,#1a2744,#0d1b2a)' }}>
      <div className="w-10 h-10 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );

  const org = dashboard?.organization || {};
  const ind = dashboard?.industryBenchmark || {};
  const tabs = ['overview', 'recruitment', 'salary', 'skills', 'learning', 'workforce', 'productivity', 'alerts'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0a1628,#1a2744,#0d1b2a)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/30 border-b border-cyan-500/20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">📊 Organization Benchmark</h1>
            <p className="text-xs text-white/40">Compare against anonymous industry benchmarks</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-cyan-300">{org.industryRank || 'Top 35%'}</p>
            <p className="text-[10px] text-white/40">Industry Rank</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => loadTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-cyan-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* Main score */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 text-center">
              <p className="text-[10px] text-white/40 mb-2">Organization Performance Index</p>
              <p className="text-4xl font-bold text-white">{org.overallScore || 79}<span className="text-lg text-white/40">%</span></p>
              <div className="flex justify-center gap-6 mt-3">
                <div><p className="text-xs text-white/50">Industry Avg</p><p className="text-sm font-bold text-blue-300">{ind.avgOverallScore || 65}%</p></div>
                <div><p className="text-xs text-white/50">Your Percentile</p><p className="text-sm font-bold text-green-300">{org.percentile || 65}th</p></div>
              </div>
            </div>

            {/* Category scores */}
            <div className="grid grid-cols-4 gap-3">
              <ScoreRing score={org.recruitment || 82} label="Recruitment" color="#06b6d4" />
              <ScoreRing score={org.retention || 80} label="Retention" color="#10b981" />
              <ScoreRing score={org.productivity || 77} label="Productivity" color="#8b5cf6" />
              <ScoreRing score={org.learning || 68} label="Learning" color="#f59e0b" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <ScoreRing score={org.hr || 74} label="HR" color="#ec4899" />
              <ScoreRing score={org.automation || 55} label="Automation" color="#14b8a6" />
              <ScoreRing score={org.aiAdoption || 42} label="AI Adoption" color="#6366f1" />
              <ScoreRing score={org.employeeSatisfaction || 71} label="Satisfaction" color="#f97316" />
            </div>

            {/* Quick comparison */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <h3 className="text-xs font-semibold text-white mb-3">Key Metrics vs Industry</h3>
              <div className="space-y-2">
                {[['Time to Hire', org.avgTimeToHire || 26, ind.avgTimeToHire?.avg || 34, 'days', true],
                  ['Offer Accept Rate', org.offerAcceptRate || 78, ind.offerAcceptRate?.avg || 72, '%', false],
                  ['Attrition Rate', org.attritionRate || 14, ind.attritionRate?.avg || 18, '%', true],
                ].map(([label, yours, avg, unit, lower]) => {
                  const good = lower ? yours <= avg : yours >= avg;
                  const diff = lower ? Math.round(((avg - yours) / avg) * 100) : Math.round(((yours - avg) / avg) * 100);
                  return (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[11px] text-white/60">{label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white font-medium">{yours} {unit}</span>
                        <span className={`text-[10px] font-bold ${good ? 'text-green-400' : 'text-orange-400'}`}>{good ? '+' : ''}{diff}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Recruitment ──────────────────────────────────────────────────── */}
        {tab === 'recruitment' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Recruitment Benchmarks</h3>
            {recruitment.map((m, i) => (
              <CompBar key={i} label={m.name} yours={m.yours} industryAvg={m.industryAvg} top10={m.top10} lowerIsBetter={m.lowerIsBetter} unit={m.unit === '₹' ? '₹' : ''} />
            ))}
            {recruitment.length === 0 && <p className="text-xs text-white/50">Loading recruitment benchmarks...</p>}
          </div>
        )}

        {/* ── Salary ───────────────────────────────────────────────────────── */}
        {tab === 'salary' && salary && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Salary Benchmarks (LPA)</h3>
            {salary.salary?.map((s, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-white font-medium">{s.level}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${s.position === 'above_market' ? 'bg-green-500/20 text-green-300' : s.position === 'at_market' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                    {s.position?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-xs font-bold text-white">₹{s.yours}</p><p className="text-[8px] text-white/40">Yours</p></div>
                  <div><p className="text-xs font-bold text-blue-300">₹{s.market}</p><p className="text-[8px] text-white/40">Market</p></div>
                  <div><p className="text-xs font-bold text-white/50">₹{s.p25}</p><p className="text-[8px] text-white/40">P25</p></div>
                  <div><p className="text-xs font-bold text-white/50">₹{s.p75}</p><p className="text-[8px] text-white/40">P75</p></div>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-white/30 italic">{salary.note}</p>
          </div>
        )}

        {/* ── Skills ───────────────────────────────────────────────────────── */}
        {tab === 'skills' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Skills Benchmark</h3>
            {skills.map((s, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-white font-medium">{s.category}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${s.demand === 'very_high' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{s.demand?.replace('_', ' ')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-xs font-bold text-white">{s.coverage}%</p><p className="text-[8px] text-white/40">Your Coverage</p></div>
                  <div><p className="text-xs font-bold text-blue-300">{s.industryAvg}%</p><p className="text-[8px] text-white/40">Industry</p></div>
                  <div><p className="text-xs font-bold text-orange-300">{s.gap}%</p><p className="text-[8px] text-white/40">Gap</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Learning ─────────────────────────────────────────────────────── */}
        {tab === 'learning' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Learning Benchmarks</h3>
            {learning.map((m, i) => (
              <CompBar key={i} label={m.metric} yours={m.yours} industryAvg={m.industryAvg} top10={m.top10} lowerIsBetter={false} />
            ))}
          </div>
        )}

        {/* ── Workforce ────────────────────────────────────────────────────── */}
        {tab === 'workforce' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Workforce Benchmarks</h3>
            {workforce.map((m, i) => (
              <CompBar key={i} label={m.metric} yours={m.yours} industryAvg={m.industryAvg} top10={m.top10} lowerIsBetter={m.lowerIsBetter} />
            ))}
          </div>
        )}

        {/* ── Productivity ─────────────────────────────────────────────────── */}
        {tab === 'productivity' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Productivity Benchmarks</h3>
            {productivity.map((m, i) => (
              <CompBar key={i} label={m.metric} yours={m.yours} industryAvg={m.industryAvg} top10={m.top10} lowerIsBetter={false} />
            ))}
          </div>
        )}

        {/* ── Alerts ───────────────────────────────────────────────────────── */}
        {tab === 'alerts' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Benchmark Alerts</h3>
            {alerts.length > 0 ? alerts.map((a, i) => (
              <div key={i} className={`bg-white/5 backdrop-blur rounded-xl p-4 border ${a.severity === 'critical' ? 'border-red-500/30' : a.severity === 'warning' ? 'border-yellow-500/30' : 'border-white/10'}`}>
                <div className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-xs text-white font-medium">{a.title}</p>
                    {a.recommendations?.length > 0 && (
                      <div className="mt-1">
                        {a.recommendations.map((r, j) => <p key={j} className="text-[10px] text-white/50">→ {r}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-6">No benchmark alerts. Performance is on track.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
