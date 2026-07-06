import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

// ── Progress Bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max = 100, color = 'from-indigo-500 to-purple-500' }) => (
  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
    <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
      style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
  </div>
);

// ── Badge ────────────────────────────────────────────────────────────────────
const ProbBadge = ({ prob }) => {
  const map = { very_high: ['bg-green-500/20 text-green-300', 'Very High'], high: ['bg-emerald-500/20 text-emerald-300', 'High'], medium: ['bg-yellow-500/20 text-yellow-300', 'Medium'], low: ['bg-red-500/20 text-red-300', 'Low'] };
  const [cls, label] = map[prob] || map.medium;
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{label}</span>;
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CareerSimulationPage() {
  const [simulation, setSimulation] = useState(null);
  const [history, setHistory] = useState([]);
  const [salary, setSalary] = useState(null);
  const [skills, setSkills] = useState([]);
  const [recommendations, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState('scenarios');

  // Form state
  const [targetRoles, setTargetRoles] = useState('');
  const [currentRole, setCurrentRole] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [simRes, histRes, salRes, skillRes, recRes] = await Promise.all([
        ApiService.getCareerSimulation(),
        ApiService.getSimulationHistory(),
        ApiService.getSimulationSalary(),
        ApiService.getSimulationSkills(),
        ApiService.getSimulationRecommendations(),
      ]);
      setSimulation(simRes.simulation || null);
      setHistory(histRes.simulations || []);
      setSalary(salRes.salary || null);
      setSkills(skillRes.skills || []);
      setRecs(recRes.recommendations || []);
    } catch (e) { console.error('Simulation load error:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRunSimulation = async () => {
    if (!targetRoles.trim()) return;
    setRunning(true);
    try {
      const roles = targetRoles.split(',').map(r => r.trim()).filter(Boolean);
      await ApiService.runCareerSimulation({ targetRoles: roles, currentRole });
      await loadData();
      setTab('scenarios');
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
    </div>
  );

  const scenarios = simulation?.scenarios || [];
  const tabs = ['run', 'scenarios', 'salary', 'skills', 'risk', 'history'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">🚀 Career Simulation</h1>
            <p className="text-xs text-white/50">AI-powered multi-scenario career planner</p>
          </div>
          {simulation && (
            <div className="text-right">
              <p className="text-xs text-white/40">Growth Potential</p>
              <p className="text-lg font-bold text-purple-300">{simulation.growthPotential || 0}%</p>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {t === 'run' ? '▶ Run' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* ── Run Simulation ───────────────────────────────────────────────── */}
        {tab === 'run' && (
          <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white">Run New Simulation</h3>
            <div>
              <label className="text-xs text-white/60 block mb-1">Target Roles (comma-separated)</label>
              <input value={targetRoles} onChange={e => setTargetRoles(e.target.value)}
                placeholder="e.g. Senior Developer, Tech Lead, Cloud Architect"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">Current Role</label>
              <input value={currentRole} onChange={e => setCurrentRole(e.target.value)}
                placeholder="e.g. Frontend Developer"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500" />
            </div>
            <button onClick={handleRunSimulation} disabled={running || !targetRoles.trim()}
              className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-50 transition">
              {running ? 'Simulating...' : '🧠 Run AI Simulation'}
            </button>
          </div>
        )}

        {/* ── Scenarios ────────────────────────────────────────────────────── */}
        {tab === 'scenarios' && (
          <div className="space-y-4">
            {scenarios.length === 0 ? (
              <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10 text-center">
                <p className="text-white/50 text-sm">No simulation yet. Run one from the "Run" tab.</p>
              </div>
            ) : scenarios.map((sc, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">{sc.targetRole}</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Timeline: {sc.timeline}</p>
                  </div>
                  <ProbBadge prob={sc.successProbability} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-white/40">Salary</p>
                    <p className="text-xs text-white font-medium">{sc.salaryRange}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-white/40">Demand</p>
                    <p className="text-xs text-white font-medium">{sc.demandScore}/100</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-white/40">Risk</p>
                    <p className={`text-xs font-medium ${sc.riskLevel === 'low' ? 'text-green-400' : sc.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {sc.riskLevel}
                    </p>
                  </div>
                </div>

                {/* Missing skills */}
                {sc.missingSkills?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">Missing Skills ({sc.missingSkills.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {sc.missingSkills.slice(0, 8).map(s => (
                        <span key={s} className="px-2 py-0.5 rounded bg-red-500/10 text-red-300 text-[10px]">{s}</span>
                      ))}
                      {sc.missingSkills.length > 8 && <span className="text-[10px] text-white/30">+{sc.missingSkills.length - 8} more</span>}
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {sc.milestones?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">Milestones</p>
                    <div className="space-y-1">
                      {sc.milestones.map((m, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                          <span className="text-[11px] text-white/70 flex-1">{m.title}</span>
                          <span className="text-[10px] text-white/40">{m.timeline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Companies & locations */}
                {sc.companies?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">Target Companies</p>
                    <div className="flex flex-wrap gap-1">
                      {sc.companies.slice(0, 5).map(c => (
                        <span key={c} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px]">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Salary Forecast ──────────────────────────────────────────────── */}
        {tab === 'salary' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Salary Forecast</h3>
            {salary && Object.keys(salary).length > 0 ? (
              <>
                {Object.entries(salary).map(([key, val]) => (
                  <div key={key} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 flex justify-between items-center">
                    <span className="text-xs text-white/60 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm text-white font-medium">{val}</span>
                  </div>
                ))}
                <p className="text-[10px] text-white/40 italic">Shown as ranges, not guarantees. Based on current skills and market data.</p>
              </>
            ) : <p className="text-xs text-white/50">Run a simulation to generate salary forecasts.</p>}
          </div>
        )}

        {/* ── Skills Gap ───────────────────────────────────────────────────── */}
        {tab === 'skills' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Skills to Acquire</h3>
            {skills.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {skills.map(s => (
                  <div key={s} className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                    <span className="text-xs text-white">{s}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-white/50">Run a simulation to identify skill gaps.</p>}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 mt-4">
                <h4 className="text-xs font-semibold text-white mb-2">AI Recommendations</h4>
                <ul className="space-y-2">
                  {recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-white/70 flex gap-2"><span className="text-purple-400">→</span>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Risk Analysis ────────────────────────────────────────────────── */}
        {tab === 'risk' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Risk Analysis</h3>
            {simulation?.riskAnalysis ? (
              <>
                {[['automationRisk', 'Automation Risk', '🤖'], ['skillObsolescence', 'Skill Obsolescence', '📉'], ['marketCompetition', 'Market Competition', '⚡']].map(([key, label, icon]) => (
                  <div key={key} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 flex justify-between items-center">
                    <span className="text-xs text-white/70">{icon} {label}</span>
                    <span className={`text-xs font-bold ${simulation.riskAnalysis[key] === 'low' ? 'text-green-400' : simulation.riskAnalysis[key] === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {simulation.riskAnalysis[key]?.toUpperCase()}
                    </span>
                  </div>
                ))}
                {simulation.riskAnalysis.mitigationPlan?.length > 0 && (
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                    <h4 className="text-xs font-semibold text-white mb-2">Mitigation Plan</h4>
                    <ul className="space-y-1">
                      {simulation.riskAnalysis.mitigationPlan.map((m, i) => (
                        <li key={i} className="text-xs text-white/70 flex gap-2"><span className="text-green-400">✓</span>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Future skills */}
                {simulation.futureSkills?.length > 0 && (
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                    <h4 className="text-xs font-semibold text-white mb-2">Emerging Skills to Watch</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {simulation.futureSkills.map(s => (
                        <span key={s} className="px-2 py-1 rounded bg-purple-500/15 text-purple-300 text-[10px] font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative roles */}
                {simulation.alternativeRoles?.length > 0 && (
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                    <h4 className="text-xs font-semibold text-white mb-2">Alternative Career Paths</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {simulation.alternativeRoles.map(r => (
                        <span key={r} className="px-2 py-1 rounded bg-indigo-500/15 text-indigo-300 text-[10px] font-medium">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : <p className="text-xs text-white/50">Run a simulation to generate risk analysis.</p>}
          </div>
        )}

        {/* ── History ──────────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Simulation History</h3>
            {history.length > 0 ? history.map((sim, i) => (
              <div key={sim._id || i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-white font-medium">{sim.currentRole || 'Simulation'}</p>
                    <p className="text-[10px] text-white/40">{new Date(sim.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-300 font-bold">{sim.growthPotential || 0}%</p>
                    <p className="text-[10px] text-white/40">Growth</p>
                  </div>
                </div>
                {sim.scenarios?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sim.scenarios.map((sc, j) => (
                      <span key={j} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/60">{sc.targetRole}</span>
                    ))}
                  </div>
                )}
              </div>
            )) : <p className="text-xs text-white/50">No simulations run yet.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
