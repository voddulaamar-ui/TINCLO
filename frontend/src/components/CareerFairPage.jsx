import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

const StatusBadge = ({ status }) => {
  const map = { live: 'bg-green-500/20 text-green-300', upcoming: 'bg-blue-500/20 text-blue-300', registration: 'bg-yellow-500/20 text-yellow-300', completed: 'bg-white/10 text-white/50' };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${map[status] || map.upcoming}`}>{status}</span>;
};

const typeIcon = (type) => {
  const map = { university: '🎓', corporate: '🏢', startup: '🚀', government: '🏛️', diversity: '🌈', women: '👩', remote: '🌐', internship: '📋', campus: '🏫', international: '✈️' };
  return map[type] || '🎪';
};

export default function CareerFairPage() {
  const [tab, setTab] = useState('events');
  const [loading, setLoading] = useState(true);
  const [fairs, setFairs] = useState([]);
  const [myRegs, setMyRegs] = useState([]);
  const [selectedFair, setSelectedFair] = useState(null);
  const [booths, setBooths] = useState([]);
  const [selectedBooth, setSelectedBooth] = useState(null);

  const loadFairs = useCallback(async () => {
    setLoading(true);
    try { const r = await ApiService.getCareerFairs({}); setFairs(r.fairs || []); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadFairs(); }, [loadFairs]);

  const loadTab = (t) => {
    setTab(t);
    if (t === 'my-events' && !myRegs.length) ApiService.getMyCareerFairRegistrations().then(r => setMyRegs(r.registrations || [])).catch(console.error);
  };

  const handleRegister = async (fairId) => {
    try { await ApiService.registerCareerFair({ careerFairId: fairId }); alert('Registered!'); loadTab('my-events'); } catch (e) { alert(e.message || 'Failed'); }
  };

  const viewFair = async (id) => {
    try {
      const [fairRes, boothRes] = await Promise.all([ApiService.getCareerFair(id), ApiService.getCareerFairBooths(id)]);
      setSelectedFair(fairRes.fair || null);
      setBooths(boothRes.booths || []);
      setTab('fair-detail');
    } catch (e) { console.error(e); }
  };

  const viewBooth = async (boothId) => {
    try { const r = await ApiService.getCareerFairBooth(boothId); setSelectedBooth(r.booth || null); setTab('booth'); } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
    </div>
  );

  const tabs = ['events', 'my-events', 'booths'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">🎪 Virtual Career Fair</h1>
            <p className="text-xs text-white/50">Digital hiring events & company showcases</p>
          </div>
          <span className="text-xs text-white/40">{fairs.length} events</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => loadTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-pink-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {t === 'my-events' ? 'My Events' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {selectedFair && <button onClick={() => setTab('fair-detail')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${tab === 'fair-detail' ? 'bg-pink-600 text-white' : 'bg-white/5 text-white/60'}`}>Fair Detail</button>}
          {selectedBooth && <button onClick={() => setTab('booth')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${tab === 'booth' ? 'bg-pink-600 text-white' : 'bg-white/5 text-white/60'}`}>Booth</button>}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">

        {/* ── Events List ──────────────────────────────────────────────────── */}
        {tab === 'events' && (
          <div className="space-y-3">
            {fairs.length > 0 ? fairs.map(f => (
              <div key={f._id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeIcon(f.type)}</span>
                    <div>
                      <h4 className="text-sm font-medium text-white">{f.title}</h4>
                      <p className="text-[10px] text-white/40">{f.type} • {f.startDate ? new Date(f.startDate).toLocaleDateString() : 'TBD'}</p>
                    </div>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
                {f.description && <p className="text-[11px] text-white/50 mb-2 line-clamp-2">{f.description}</p>}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center"><p className="text-xs font-bold text-white">{f.registrationCount || 0}</p><p className="text-[8px] text-white/40">Registered</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{f.companies?.length || 0}</p><p className="text-[8px] text-white/40">Companies</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{f.interviewCount || 0}</p><p className="text-[8px] text-white/40">Interviews</p></div>
                </div>
                {f.sponsors?.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {f.sponsors.slice(0, 3).map((s, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-300 text-[8px]">{s.name}</span>)}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => viewFair(f._id)} className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs hover:bg-white/10 transition">View Details</button>
                  {(f.status === 'registration' || f.status === 'upcoming') && (
                    <button onClick={() => handleRegister(f._id)} className="flex-1 py-1.5 rounded-lg bg-pink-600 text-white text-xs font-medium hover:bg-pink-500 transition">Register</button>
                  )}
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-12">No career fairs available yet.</p>}
          </div>
        )}

        {/* ── My Events ────────────────────────────────────────────────────── */}
        {tab === 'my-events' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">My Registrations</h3>
            {myRegs.length > 0 ? myRegs.map((r, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-xs text-white font-medium">{r.careerFairId?.title || 'Career Fair'}</p>
                  <p className="text-[10px] text-white/40">{r.careerFairId?.startDate ? new Date(r.careerFairId.startDate).toLocaleDateString() : ''} • {r.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40">{r.boothsVisited?.length || 0} booths</p>
                  <p className="text-[10px] text-white/40">{r.interviewsScheduled?.length || 0} interviews</p>
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-6">No registrations yet.</p>}
          </div>
        )}

        {/* ── Booths List ──────────────────────────────────────────────────── */}
        {tab === 'booths' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Company Booths</h3>
            {booths.length > 0 ? booths.map(b => (
              <div key={b._id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/8 transition" onClick={() => viewBooth(b._id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">{b.logo ? '🏢' : '🏢'}</div>
                  <div className="flex-1">
                    <h4 className="text-sm text-white font-medium">{b.companyName}</h4>
                    <p className="text-[10px] text-white/40">{b.openJobs?.length || 0} jobs • {b.visitors || 0} visitors</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {b.chatEnabled && <span className="text-[8px] text-green-300">💬 Chat</span>}
                    {b.recruiters?.some(r => r.isOnline) && <span className="text-[8px] text-green-400">● Online</span>}
                  </div>
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-6">Select a career fair to view booths.</p>}
          </div>
        )}

        {/* ── Fair Detail ──────────────────────────────────────────────────── */}
        {tab === 'fair-detail' && selectedFair && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedFair.title}</h3>
                  <p className="text-xs text-white/50 mt-0.5">{selectedFair.theme || selectedFair.type}</p>
                </div>
                <StatusBadge status={selectedFair.status} />
              </div>
              {selectedFair.description && <p className="text-xs text-white/60 mb-3">{selectedFair.description}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-white/40">Start</p><p className="text-xs text-white">{selectedFair.startDate ? new Date(selectedFair.startDate).toLocaleDateString() : 'TBD'}</p></div>
                <div><p className="text-[10px] text-white/40">End</p><p className="text-xs text-white">{selectedFair.endDate ? new Date(selectedFair.endDate).toLocaleDateString() : 'TBD'}</p></div>
                <div><p className="text-[10px] text-white/40">Companies</p><p className="text-xs text-white">{selectedFair.companies?.length || 0}</p></div>
                <div><p className="text-[10px] text-white/40">Registered</p><p className="text-xs text-white">{selectedFair.registrationCount || 0}</p></div>
              </div>
            </div>

            {/* Sessions */}
            {selectedFair.sessions?.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Sessions</h4>
                {selectedFair.sessions.map((s, i) => (
                  <div key={i} className="py-2 border-b border-white/5 last:border-0 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-white">{s.title}</p>
                      <p className="text-[9px] text-white/40">{s.speaker} • {s.type}</p>
                    </div>
                    {s.startTime && <span className="text-[9px] text-white/30">{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Booths preview */}
            {booths.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-white mb-2">Company Booths ({booths.length})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {booths.slice(0, 6).map(b => (
                    <div key={b._id} onClick={() => viewBooth(b._id)} className="bg-white/5 rounded-lg p-3 border border-white/10 cursor-pointer hover:bg-white/8">
                      <p className="text-xs text-white font-medium truncate">{b.companyName}</p>
                      <p className="text-[9px] text-white/40">{b.openJobs?.length || 0} jobs</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {(selectedFair.status === 'registration' || selectedFair.status === 'upcoming') && (
                <button onClick={() => handleRegister(selectedFair._id)} className="flex-1 py-2.5 rounded-lg bg-pink-600 text-white text-sm font-medium">Register</button>
              )}
              <button onClick={() => { setTab('booths'); }} className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/70 text-sm">Browse Booths</button>
            </div>
          </div>
        )}

        {/* ── Booth Detail ─────────────────────────────────────────────────── */}
        {tab === 'booth' && selectedBooth && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10">
              <h3 className="text-base font-bold text-white mb-1">{selectedBooth.companyName}</h3>
              {selectedBooth.description && <p className="text-xs text-white/60 mb-3">{selectedBooth.description}</p>}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center"><p className="text-xs font-bold text-white">{selectedBooth.visitors || 0}</p><p className="text-[8px] text-white/40">Visitors</p></div>
                <div className="text-center"><p className="text-xs font-bold text-white">{selectedBooth.openJobs?.length || 0}</p><p className="text-[8px] text-white/40">Jobs</p></div>
                <div className="text-center"><p className="text-xs font-bold text-white">{selectedBooth.recruiters?.length || 0}</p><p className="text-[8px] text-white/40">Recruiters</p></div>
              </div>
              {selectedBooth.benefits?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-white/40 mb-1">Benefits</p>
                  <div className="flex flex-wrap gap-1">{selectedBooth.benefits.map((b, i) => <span key={i} className="px-2 py-0.5 rounded bg-green-500/10 text-green-300 text-[9px]">{b}</span>)}</div>
                </div>
              )}
              {selectedBooth.culture && <p className="text-[11px] text-white/50 italic mb-3">{selectedBooth.culture}</p>}
            </div>

            {/* Open Jobs */}
            {selectedBooth.openJobs?.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Open Positions</h4>
                {selectedBooth.openJobs.map((j, i) => (
                  <div key={i} className="py-2 border-b border-white/5 last:border-0 flex justify-between">
                    <div><p className="text-xs text-white">{j.title}</p><p className="text-[9px] text-white/40">{j.location} • {j.type}</p></div>
                    <span className="text-[10px] text-pink-300">{j.salary || '—'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recruiters */}
            {selectedBooth.recruiters?.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Recruiters</h4>
                {selectedBooth.recruiters.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <span className={`w-2 h-2 rounded-full ${r.isOnline ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span className="text-xs text-white/70">{r.name}</span>
                    <span className="text-[9px] text-white/30">{r.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => ApiService.dropResume(selectedBooth._id, '').then(() => alert('Resume dropped!'))} className="flex-1 py-2 rounded-lg bg-pink-600 text-white text-xs font-medium">Drop Resume</button>
              {selectedBooth.chatEnabled && <button onClick={() => alert('Chat feature — connect via live event')} className="flex-1 py-2 rounded-lg bg-white/5 text-white/70 text-xs">💬 Chat</button>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
