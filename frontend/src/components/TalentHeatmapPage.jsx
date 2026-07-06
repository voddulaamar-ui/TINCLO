import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

// ── Demand Badge ─────────────────────────────────────────────────────────────
const DemandBadge = ({ level }) => {
  const map = {
    very_high: ['bg-red-500/20 text-red-300', 'Very High'],
    high: ['bg-orange-500/20 text-orange-300', 'High'],
    medium: ['bg-yellow-500/20 text-yellow-300', 'Medium'],
    low: ['bg-green-500/20 text-green-300', 'Low'],
  };
  const [cls, label] = map[level] || map.medium;
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{label}</span>;
};

// ── Heat Bar ─────────────────────────────────────────────────────────────────
const HeatBar = ({ value, max = 100 }) => {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct > 75 ? 'from-red-500 to-orange-500' : pct > 50 ? 'from-orange-500 to-yellow-500' : pct > 25 ? 'from-yellow-500 to-green-500' : 'from-green-500 to-emerald-500';
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TalentHeatmapPage() {
  const [tab, setTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [global, setGlobal] = useState(null);
  const [skills, setSkills] = useState([]);
  const [salary, setSalary] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [trends, setTrends] = useState({ rising: [], emerging: [] });
  const [remote, setRemote] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [competition, setCompetition] = useState(null);
  const [skillSearch, setSkillSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cityDetail, setCityDetail] = useState(null);

  const loadGlobal = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, tRes, rRes] = await Promise.all([
        ApiService.getHeatmapGlobal(),
        ApiService.getHeatmapTrends(),
        ApiService.getHeatmapRemote(),
      ]);
      setGlobal(gRes);
      setTrends(tRes);
      setRemote(rRes);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadGlobal(); }, [loadGlobal]);

  const loadSkills = async (q) => {
    try { const r = await ApiService.getHeatmapSkills(q || ''); setSkills(r.skills || []); } catch (e) { console.error(e); }
  };
  const loadSalary = async () => {
    try { const r = await ApiService.getHeatmapSalary({}); setSalary(r.salary || []); } catch (e) { console.error(e); }
  };
  const loadCompanies = async () => {
    try { const r = await ApiService.getHeatmapCompanies(); setCompanies(r.companies || []); } catch (e) { console.error(e); }
  };
  const loadForecasts = async () => {
    try { const r = await ApiService.getHeatmapForecast(); setForecasts(r.forecasts || []); } catch (e) { console.error(e); }
  };
  const loadInsights = async () => {
    try { const r = await ApiService.getHeatmapInsights(); setInsights(r.insights || []); } catch (e) { console.error(e); }
  };
  const loadCompetition = async (skill) => {
    try { const r = await ApiService.getHeatmapCompetition(skill); setCompetition(r.competition || null); } catch (e) { console.error(e); }
  };
  const loadCity = async (city) => {
    try { const r = await ApiService.getHeatmapCity(city); setCityDetail(r.location || null); } catch (e) { console.error(e); }
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'skills' && !skills.length) loadSkills();
    if (t === 'salary' && !salary.length) loadSalary();
    if (t === 'companies' && !companies.length) loadCompanies();
    if (t === 'forecast' && !forecasts.length) loadForecasts();
    if (t === 'insights') loadInsights();
    if (t === 'competition') loadCompetition('');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
    </div>
  );

  const tabs = ['global', 'skills', 'salary', 'companies', 'remote', 'trends', 'forecast', 'competition', 'insights', 'city'];
  const locations = global?.locations || [];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">🌍 Talent Heatmap</h1>
            <p className="text-xs text-white/50">Global talent intelligence platform</p>
          </div>
          {global?.summary && (
            <div className="text-right">
              <p className="text-lg font-bold text-teal-300">{global.summary.totalJobs?.toLocaleString()}</p>
              <p className="text-[10px] text-white/40">Active Jobs</p>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => handleTabChange(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-teal-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">

        {/* ── Global ───────────────────────────────────────────────────────── */}
        {tab === 'global' && (
          <>
            {/* Summary cards */}
            {global?.summary && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
                  <p className="text-lg font-bold text-white">{global.summary.totalJobs?.toLocaleString()}</p>
                  <p className="text-[10px] text-white/50">Total Jobs</p>
                </div>
                <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
                  <p className="text-lg font-bold text-white">{global.summary.totalCities}</p>
                  <p className="text-[10px] text-white/50">Active Cities</p>
                </div>
                <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
                  <p className="text-lg font-bold text-teal-300">+{global.summary.avgGrowth}%</p>
                  <p className="text-[10px] text-white/50">Avg Growth</p>
                </div>
              </div>
            )}

            {/* Location list (heatmap style) */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Top Hiring Locations</h3>
              {locations.slice(0, 15).map((loc, i) => (
                <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-white">{loc.city}</h4>
                      <p className="text-[10px] text-white/40">{loc.activeCompanies} companies hiring</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-300">{loc.totalJobs} jobs</span>
                      <DemandBadge level={loc.demandLevel} />
                    </div>
                  </div>
                  <HeatBar value={loc.totalJobs} max={locations[0]?.totalJobs || 100} />
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-white/40">Avg: ₹{loc.avgSalary} LPA</span>
                    <span className="text-[10px] text-white/40">Growth: {loc.hiringGrowth > 0 ? '+' : ''}{loc.hiringGrowth}%</span>
                    <span className="text-[10px] text-white/40">Remote: {loc.remoteJobs}</span>
                  </div>
                  {loc.topSkills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {loc.topSkills.slice(0, 5).map(s => (
                        <span key={s.skill} className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[9px]">{s.skill}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Skills ───────────────────────────────────────────────────────── */}
        {tab === 'skills' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)} placeholder="Search skill (e.g. React, Python)"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500" />
              <button onClick={() => loadSkills(skillSearch)} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium">Search</button>
            </div>
            {skills.map((s, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-white">{s.skill}</h4>
                  <DemandBadge level={s.demandLevel} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center"><p className="text-xs font-bold text-white">{s.totalJobs}</p><p className="text-[9px] text-white/40">Jobs</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">₹{s.avgSalary}</p><p className="text-[9px] text-white/40">Avg Salary</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{s.remoteAvailability}%</p><p className="text-[9px] text-white/40">Remote</p></div>
                </div>
                <HeatBar value={s.competitionIndex} />
                {s.topCities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.topCities.slice(0, 5).map(c => (
                      <span key={c.city} className="px-1.5 py-0.5 rounded bg-white/5 text-white/60 text-[9px]">{c.city} ({c.jobs})</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {skills.length === 0 && <p className="text-xs text-white/50 text-center">Search for a skill to see demand data.</p>}
          </div>
        )}

        {/* ── Salary ───────────────────────────────────────────────────────── */}
        {tab === 'salary' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Salary Comparison</h3>
            {salary.length > 0 ? salary.map((s, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-white font-medium">{s.city || s.role}</span>
                  <span className="text-xs text-teal-300 font-bold">₹{s.avgSalary} LPA</span>
                </div>
                <HeatBar value={s.avgSalary} max={salary[0]?.avgSalary || 30} />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-white/40">Min: ₹{s.minSalary}</span>
                  <span className="text-[10px] text-white/40">Median: ₹{s.medianSalary}</span>
                  <span className="text-[10px] text-white/40">Max: ₹{s.maxSalary}</span>
                </div>
              </div>
            )) : <p className="text-xs text-white/50">No salary data available yet.</p>}
            <p className="text-[10px] text-white/30 italic">Salary estimates based on aggregated market data. Shown as ranges, not guarantees.</p>
          </div>
        )}

        {/* ── Companies ────────────────────────────────────────────────────── */}
        {tab === 'companies' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Top Hiring Companies</h3>
            {companies.map((c, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-white">{c.name}</h4>
                  <span className="text-xs font-bold text-teal-300">{c.openings} openings</span>
                </div>
                <HeatBar value={c.openings} max={companies[0]?.openings || 50} />
                {c.locations?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.locations.map(l => <span key={l} className="px-1.5 py-0.5 rounded bg-white/5 text-white/50 text-[9px]">{l}</span>)}
                  </div>
                )}
                {c.topSkills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.topSkills.slice(0, 6).map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[9px]">{s}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Remote ───────────────────────────────────────────────────────── */}
        {tab === 'remote' && remote && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Remote Work Distribution</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['Remote', remote.stats?.remote, 'text-green-400'], ['Hybrid', remote.stats?.hybrid, 'text-yellow-400'], ['Office', remote.stats?.office, 'text-blue-400'], ['Total', remote.stats?.total, 'text-white']].map(([label, val, color]) => (
                <div key={label} className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
                  <p className={`text-lg font-bold ${color}`}>{val?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-white/50">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-xs text-white/60">Remote Percentage</p>
              <p className="text-2xl font-bold text-green-400">{remote.stats?.remotePercentage || 0}%</p>
              <HeatBar value={remote.stats?.remotePercentage || 0} />
            </div>
            {remote.recentRemoteJobs?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-white">Recent Remote Jobs</h4>
                {remote.recentRemoteJobs.slice(0, 8).map((j, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10 flex justify-between">
                    <div><p className="text-xs text-white">{j.title}</p><p className="text-[10px] text-white/40">{j.company}</p></div>
                    <span className="text-[10px] text-white/40">{j.salary || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Trends ───────────────────────────────────────────────────────── */}
        {tab === 'trends' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Rising Skills</h3>
              <div className="space-y-2">
                {trends.rising?.map((t, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-xs text-white font-medium">{t.skill}</span>
                    </div>
                    <span className="text-xs text-teal-300 font-bold">{t.demand} jobs</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Emerging Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {trends.emerging?.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-medium border border-purple-500/20">{t.skill}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Forecast ─────────────────────────────────────────────────────── */}
        {tab === 'forecast' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Market Forecasts</h3>
            {forecasts.map((f, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-white">{f.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${f.confidence === 'high' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                    {f.confidence} confidence
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center"><p className="text-xs font-bold text-white">{f.currentDemand}</p><p className="text-[9px] text-white/40">Current</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-teal-300">{f.forecastDemand}</p><p className="text-[9px] text-white/40">Forecast</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-green-400">+{f.growthRate}%</p><p className="text-[9px] text-white/40">Growth</p></div>
                </div>
                {f.aiSummary && <p className="text-[10px] text-white/50 italic">{f.aiSummary}</p>}
              </div>
            ))}
            {forecasts.length === 0 && <p className="text-xs text-white/50">No forecast data available.</p>}
            <p className="text-[10px] text-white/30 italic">Forecasts include confidence levels. Predictions are estimates, not guarantees.</p>
          </div>
        )}

        {/* ── Competition ──────────────────────────────────────────────────── */}
        {tab === 'competition' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)} placeholder="Check competition for a skill"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500" />
              <button onClick={() => loadCompetition(skillSearch)} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium">Check</button>
            </div>
            {competition && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 space-y-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{competition.index}/100</p>
                  <p className="text-xs text-white/50">Competition Index for "{competition.skill}"</p>
                </div>
                <HeatBar value={competition.index} />
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center"><p className="text-xs font-bold text-white">{competition.totalJobs}</p><p className="text-[9px] text-white/40">Jobs</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{competition.uniqueCompanies}</p><p className="text-[9px] text-white/40">Companies</p></div>
                  <div className="text-center">
                    <p className={`text-xs font-bold ${competition.level === 'very_high' ? 'text-red-400' : competition.level === 'high' ? 'text-orange-400' : 'text-green-400'}`}>{competition.level?.toUpperCase()}</p>
                    <p className="text-[9px] text-white/40">Level</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Insights ─────────────────────────────────────────────────────── */}
        {tab === 'insights' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">AI Market Insights</h3>
            {insights.length > 0 ? insights.map((ins, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 flex gap-3">
                <span className="text-teal-400 text-sm">💡</span>
                <p className="text-xs text-white/70">{ins}</p>
              </div>
            )) : <p className="text-xs text-white/50">Loading insights...</p>}
          </div>
        )}

        {/* ── City Detail ──────────────────────────────────────────────────── */}
        {tab === 'city' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={citySearch} onChange={e => setCitySearch(e.target.value)} placeholder="Search city (e.g. Bangalore, Hyderabad)"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500" />
              <button onClick={() => loadCity(citySearch)} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium">Go</button>
            </div>
            {cityDetail ? (
              <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white">{cityDetail.city}</h4>
                  <DemandBadge level={cityDetail.demandLevel} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center"><p className="text-sm font-bold text-white">{cityDetail.totalJobs}</p><p className="text-[9px] text-white/40">Jobs</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-white">{cityDetail.activeCompanies}</p><p className="text-[9px] text-white/40">Companies</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-teal-300">₹{cityDetail.avgSalary}</p><p className="text-[9px] text-white/40">Avg Salary</p></div>
                </div>
                {cityDetail.topSkills?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">Top Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {cityDetail.topSkills.slice(0, 10).map(s => (
                        <span key={s.skill} className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[10px]">{s.skill} ({s.demand})</span>
                      ))}
                    </div>
                  </div>
                )}
                {cityDetail.topCompanies?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">Top Companies</p>
                    <div className="flex flex-wrap gap-1">
                      {cityDetail.topCompanies.map(c => (
                        <span key={c.name} className="px-2 py-0.5 rounded bg-white/5 text-white/60 text-[10px]">{c.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : <p className="text-xs text-white/50 text-center">Search for a city to see detailed analytics.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
