import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

// ── Radar Chart (SVG) ────────────────────────────────────────────────────────
const RadarChart = ({ dimensions }) => {
  const size = 220, center = size / 2, radius = 85;
  const labels = Object.keys(dimensions);
  const n = labels.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i, value) => {
    const angle = angleStep * i - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const polygon = labels.map((_, i) => {
    const p = getPoint(i, dimensions[labels[i]]);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto">
      {/* Grid rings */}
      {[25, 50, 75, 100].map(v => (
        <polygon key={v} points={labels.map((_, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      ))}
      {/* Axis lines */}
      {labels.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />;
      })}
      {/* Data polygon */}
      <polygon points={polygon} fill="rgba(99,102,241,0.35)" stroke="#818cf8" strokeWidth="1.5" />
      {/* Labels */}
      {labels.map((label, i) => {
        const p = getPoint(i, 118);
        return <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          className="fill-white/70 text-[7px] font-medium capitalize">{label}</text>;
      })}
    </svg>
  );
};

// ── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, label, size = 100, color = '#818cf8' }) => {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700" />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-lg font-bold">{score}%</text>
      </svg>
      <span className="text-xs text-white/60 text-center">{label}</span>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CareerDnaPage() {
  const [dna, setDna] = useState(null);
  const [insights, setInsights] = useState([]);
  const [readiness, setReadiness] = useState([]);
  const [salary, setSalary] = useState(null);
  const [recommendations, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dnaRes, insightsRes, readinessRes, salaryRes, recsRes] = await Promise.all([
        ApiService.getCareerDna(),
        ApiService.getCareerDnaInsights(),
        ApiService.getCareerDnaReadiness(),
        ApiService.getCareerDnaSalary(),
        ApiService.getCareerDnaRecommendations(),
      ]);
      setDna(dnaRes.careerDna || null);
      setInsights(insightsRes.insights || []);
      setReadiness(readinessRes.readiness || []);
      setSalary(salaryRes.salary || null);
      setRecs(recsRes.recommendations || []);
    } catch (e) { console.error('Career DNA load error:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRecalculate = async () => {
    setUpdating(true);
    try {
      await ApiService.updateCareerDna({});
      await loadData();
    } catch (e) { console.error(e); }
    setUpdating(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
    </div>
  );

  const dimensions = dna ? {
    technical: dna.technical || 0, learning: dna.learning || 0, project: dna.project || 0,
    experience: dna.experience || 0, communication: dna.communication || 0,
    leadership: dna.leadership || 0, innovation: dna.innovation || 0, collaboration: dna.collaboration || 0,
  } : {};

  const tabs = ['overview', 'dimensions', 'readiness', 'salary', 'insights', 'goals', 'privacy'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">🧬 Career DNA</h1>
            <p className="text-xs text-white/50">Your dynamic professional identity</p>
          </div>
          <button onClick={handleRecalculate} disabled={updating}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium disabled:opacity-50 transition">
            {updating ? 'Calculating...' : '🔄 Recalculate'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* Score rings */}
            <div className="grid grid-cols-3 gap-4">
              <ScoreRing score={dna?.overallScore || 0} label="Career DNA" color="#818cf8" />
              <ScoreRing score={dna?.careerReadiness || 0} label="Readiness" color="#34d399" />
              <ScoreRing score={dna?.growthPotential || 0} label="Growth" color="#fbbf24" />
            </div>

            {/* Radar */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-2">Strength Profile</h3>
              <RadarChart dimensions={dimensions} />
            </div>

            {/* Quick insights */}
            {insights.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-2">🤖 AI Insights</h3>
                <ul className="space-y-2">
                  {insights.map((ins, i) => (
                    <li key={i} className="text-xs text-white/70 flex gap-2"><span className="text-indigo-400">•</span>{ins}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ── Dimensions ───────────────────────────────────────────────────── */}
        {tab === 'dimensions' && (
          <div className="space-y-3">
            {Object.entries(dimensions).map(([key, val]) => (
              <div key={key} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-white font-medium capitalize">{key} DNA</span>
                  <span className="text-xs text-indigo-300 font-bold">{val}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                    style={{ width: `${val}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Readiness ────────────────────────────────────────────────────── */}
        {tab === 'readiness' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Career Readiness by Role</h3>
            {readiness.map((r, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-white">{r.role}</span>
                  <span className={`text-xs font-bold ${r.percent >= 80 ? 'text-green-400' : r.percent >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{r.percent}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${r.percent >= 80 ? 'bg-green-500' : r.percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${r.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Salary ───────────────────────────────────────────────────────── */}
        {tab === 'salary' && salary && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Salary Insights</h3>
            {Object.entries(salary).filter(([k]) => k !== 'confidence').map(([key, val]) => (
              <div key={key} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 flex justify-between items-center">
                <span className="text-xs text-white/60 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-sm text-white font-medium">{val}</span>
              </div>
            ))}
            <p className="text-[10px] text-white/40 italic">Estimates shown as ranges, not guarantees. Confidence: {salary.confidence || 'medium'}.</p>
          </div>
        )}

        {/* ── Insights ─────────────────────────────────────────────────────── */}
        {tab === 'insights' && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3">AI Insights</h3>
              <ul className="space-y-2">
                {insights.length > 0 ? insights.map((ins, i) => (
                  <li key={i} className="text-xs text-white/70 flex gap-2"><span className="text-indigo-400">💡</span>{ins}</li>
                )) : <li className="text-xs text-white/50">Recalculate your DNA to generate insights.</li>}
              </ul>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-white/70 flex gap-2">
                    <span className="text-green-400">{rec.type === 'learning' ? '📚' : rec.type === 'project' ? '🚀' : '🎯'}</span>
                    {rec.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Goals ────────────────────────────────────────────────────────── */}
        {tab === 'goals' && (
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-white">Career Goals</h3>
            {dna?.goals ? (
              <div className="grid grid-cols-2 gap-3">
                {[['dreamRole', '🎯 Dream Role'], ['dreamCompany', '🏢 Dream Company'], ['salaryGoal', '💰 Salary Goal'],
                  ['preferredLocation', '📍 Location'], ['preferredIndustry', '🏭 Industry'], ['workStyle', '🏠 Work Style']].map(([key, label]) => (
                  <div key={key} className="bg-white/5 rounded-lg p-3">
                    <p className="text-[10px] text-white/50">{label}</p>
                    <p className="text-xs text-white mt-0.5">{dna.goals[key] || '—'}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-white/50">No goals set yet. Update your Career DNA to add goals.</p>}
          </div>
        )}

        {/* ── Privacy ──────────────────────────────────────────────────────── */}
        {tab === 'privacy' && (
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-white">Privacy Settings</h3>
            <p className="text-xs text-white/50">Current visibility: <span className="text-indigo-300 font-medium">{dna?.privacy?.visibility || 'recruiters'}</span></p>
            <div className="grid grid-cols-2 gap-2">
              {['public', 'recruiters', 'connections', 'private'].map(v => (
                <button key={v} onClick={async () => { await ApiService.simulateCareer({ visibility: v }); loadData(); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition ${dna?.privacy?.visibility === v ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/40">You control who can access your Career DNA profile and AI-generated insights.</p>
          </div>
        )}
      </main>
    </div>
  );
}
