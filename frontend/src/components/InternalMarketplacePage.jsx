import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

const TypeBadge = ({ type }) => {
  const map = { full_time: ['bg-blue-500/20 text-blue-300', 'Full Time'], gig: ['bg-purple-500/20 text-purple-300', 'Gig'], project: ['bg-teal-500/20 text-teal-300', 'Project'], rotation: ['bg-orange-500/20 text-orange-300', 'Rotation'], mentorship: ['bg-pink-500/20 text-pink-300', 'Mentorship'], stretch_assignment: ['bg-yellow-500/20 text-yellow-300', 'Stretch'] };
  const [cls, label] = map[type] || map.full_time;
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{label}</span>;
};

export default function InternalMarketplacePage() {
  const [tab, setTab] = useState('browse');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [recommendations, setRecs] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await ApiService.getInternalJobs({}); setJobs(r.jobs || []); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadTab = (t) => {
    setTab(t);
    if (t === 'my-apps' && !myApps.length) ApiService.getMyInternalApps().then(r => setMyApps(r.applications || [])).catch(console.error);
    if (t === 'recommendations' && !recommendations.length) ApiService.getInternalRecommendations().then(r => setRecs(r.recommendations || [])).catch(console.error);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
    </div>
  );

  const tabs = ['browse', 'my-apps', 'recommendations'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div><h1 className="text-xl font-bold text-white">🏢 Internal Marketplace</h1><p className="text-xs text-white/50">Employee mobility & internal opportunities</p></div>
          <span className="text-xs text-white/40">{jobs.length} openings</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {tabs.map(t => <button key={t} onClick={() => loadTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{t === 'my-apps' ? 'My Applications' : t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-4">
        {tab === 'browse' && jobs.map(j => (
          <div key={j._id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <div><h4 className="text-sm font-medium text-white">{j.title}</h4><p className="text-[10px] text-white/40">{j.department} • {j.location}</p></div>
              <TypeBadge type={j.type} />
            </div>
            {j.requiredSkills?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{j.requiredSkills.slice(0, 5).map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-white/5 text-white/50 text-[9px]">{s}</span>)}</div>}
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white/30">{j.applicants} applicants</span>
              <button onClick={async () => { await ApiService.applyInternalJob({ jobId: j._id }); alert('Applied!'); }} className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium">Apply</button>
            </div>
          </div>
        ))}
        {tab === 'browse' && jobs.length === 0 && <p className="text-xs text-white/50 text-center py-8">No internal opportunities available.</p>}

        {tab === 'my-apps' && (
          <div className="space-y-3">
            {myApps.length > 0 ? myApps.map(a => (
              <div key={a._id} className="bg-white/5 rounded-xl p-4 border border-white/10 flex justify-between items-center">
                <div><p className="text-xs text-white">{a.jobId?.title || 'Internal Role'}</p><p className="text-[10px] text-white/40">{a.movementType} • {a.status}</p></div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${a.status === 'selected' ? 'bg-green-500/20 text-green-300' : a.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{a.status}</span>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-8">No applications yet.</p>}
          </div>
        )}

        {tab === 'recommendations' && (
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-blue-500/20">
                <h4 className="text-sm text-white font-medium">{r.title}</h4>
                <p className="text-[10px] text-white/40">{r.department} • {r.matchReason}</p>
              </div>
            ))}
            {recommendations.length === 0 && <p className="text-xs text-white/50 text-center py-8">No recommendations yet.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
