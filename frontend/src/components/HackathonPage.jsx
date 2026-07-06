import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = { live: 'bg-green-500/20 text-green-300', upcoming: 'bg-blue-500/20 text-blue-300', registration: 'bg-yellow-500/20 text-yellow-300', completed: 'bg-white/10 text-white/50', judging: 'bg-purple-500/20 text-purple-300' };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${map[status] || map.upcoming}`}>{status}</span>;
};

// ── Type Icon ────────────────────────────────────────────────────────────────
const typeIcon = (type) => {
  const map = { coding: '💻', ai: '🤖', ml: '🧠', data_science: '📊', cybersecurity: '🔒', cloud: '☁️', uiux: '🎨', game_dev: '🎮', web: '🌐', mobile: '📱', blockchain: '⛓️', startup: '🚀', innovation: '💡', product: '📦' };
  return map[type] || '🏆';
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function HackathonPage() {
  const [tab, setTab] = useState('discover');
  const [loading, setLoading] = useState(true);
  const [hackathons, setHackathons] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [regForm, setRegForm] = useState({ teamName: '' });
  const [joinCode, setJoinCode] = useState('');

  const loadHackathons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.getHackathons({});
      setHackathons(res.hackathons || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadHackathons(); }, [loadHackathons]);

  const loadTab = (t) => {
    setTab(t);
    if (t === 'my-teams' && !myTeams.length) ApiService.getMyHackathonTeams().then(r => setMyTeams(r.teams || [])).catch(console.error);
    if (t === 'certificates' && !certificates.length) ApiService.getHackathonCertificates().then(r => setCertificates(r.certificates || [])).catch(console.error);
  };

  const handleRegister = async (hackathonId) => {
    try {
      await ApiService.registerHackathon({ hackathonId, teamName: regForm.teamName || undefined });
      setRegForm({ teamName: '' });
      ApiService.getMyHackathonTeams().then(r => setMyTeams(r.teams || []));
      alert('Registered successfully!');
    } catch (e) { alert(e.message || 'Registration failed'); }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    try {
      await ApiService.joinHackathonTeam(joinCode);
      setJoinCode('');
      ApiService.getMyHackathonTeams().then(r => setMyTeams(r.teams || []));
      alert('Joined team!');
    } catch (e) { alert(e.message || 'Join failed'); }
  };

  const loadLeaderboard = async (hackathonId) => {
    try {
      const res = await ApiService.getHackathonLeaderboard(hackathonId);
      setLeaderboard(res.leaderboard || []);
      setTab('leaderboard');
    } catch (e) { console.error(e); }
  };

  const viewHackathon = async (id) => {
    try {
      const res = await ApiService.getHackathon(id);
      setSelectedHackathon(res.hackathon || null);
      setTab('detail');
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
    </div>
  );

  const tabs = ['discover', 'my-teams', 'join', 'certificates', 'leaderboard'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">🏆 Hackathon Hub</h1>
            <p className="text-xs text-white/50">Competitions, innovation & talent discovery</p>
          </div>
          <span className="text-xs text-white/40">{hackathons.length} events</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => loadTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-orange-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {t === 'my-teams' ? 'My Teams' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {selectedHackathon && <button onClick={() => setTab('detail')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${tab === 'detail' ? 'bg-orange-600 text-white' : 'bg-white/5 text-white/60'}`}>Details</button>}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">

        {/* ── Discover ─────────────────────────────────────────────────────── */}
        {tab === 'discover' && (
          <div className="space-y-3">
            {hackathons.length > 0 ? hackathons.map(h => (
              <div key={h._id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeIcon(h.type)}</span>
                    <div>
                      <h4 className="text-sm font-medium text-white">{h.title}</h4>
                      <p className="text-[10px] text-white/40">{h.theme || h.type}</p>
                    </div>
                  </div>
                  <StatusBadge status={h.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center"><p className="text-xs font-bold text-white">{h.registrationCount || 0}</p><p className="text-[8px] text-white/40">Registered</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{h.teamCount || 0}</p><p className="text-[8px] text-white/40">Teams</p></div>
                  <div className="text-center"><p className="text-xs font-bold text-white">{h.submissionCount || 0}</p><p className="text-[8px] text-white/40">Submissions</p></div>
                </div>
                {h.prizes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {h.prizes.slice(0, 3).map((p, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-300 text-[9px]">🏅 {p.title || `#${p.rank}`}: {p.value}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => viewHackathon(h._id)} className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs hover:bg-white/10 transition">View Details</button>
                  {(h.status === 'registration' || h.status === 'upcoming') && (
                    <button onClick={() => handleRegister(h._id)} className="flex-1 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium hover:bg-orange-500 transition">Register</button>
                  )}
                  {(h.status === 'completed' || h.status === 'live') && (
                    <button onClick={() => loadLeaderboard(h._id)} className="flex-1 py-1.5 rounded-lg bg-purple-600/50 text-white text-xs hover:bg-purple-600 transition">Leaderboard</button>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <p className="text-white/50 text-sm">No hackathons available yet.</p>
                <p className="text-white/30 text-xs mt-1">Check back soon or create your own!</p>
              </div>
            )}
          </div>
        )}

        {/* ── My Teams ─────────────────────────────────────────────────────── */}
        {tab === 'my-teams' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">My Teams</h3>
            {myTeams.length > 0 ? myTeams.map(t => (
              <div key={t._id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm text-white font-medium">{t.name}</h4>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-[10px] text-white/40 mb-2">{t.hackathonId?.title || 'Hackathon'}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/50">👥 {t.members?.length || 0} members</span>
                  <span className="text-[10px] text-white/50">🔑 {t.inviteCode}</span>
                  {t.totalScore > 0 && <span className="text-[10px] text-orange-300">⭐ {t.totalScore} pts</span>}
                </div>
                {t.members?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.members.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-white/60 text-[9px]">{m.name || m.userId} {m.role === 'leader' ? '👑' : ''}</span>
                    ))}
                  </div>
                )}
              </div>
            )) : <p className="text-xs text-white/50 text-center py-6">You haven't joined any teams yet.</p>}
          </div>
        )}

        {/* ── Join Team ────────────────────────────────────────────────────── */}
        {tab === 'join' && (
          <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white">Join a Team</h3>
            <div>
              <label className="text-xs text-white/60 block mb-1">Invite Code</label>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter team invite code"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500" />
            </div>
            <button onClick={handleJoinTeam} disabled={!joinCode.trim()}
              className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium disabled:opacity-50 transition">
              Join Team
            </button>
          </div>
        )}

        {/* ── Certificates ─────────────────────────────────────────────────── */}
        {tab === 'certificates' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">My Certificates</h3>
            {certificates.length > 0 ? certificates.map((c, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm text-white font-medium">{c.title}</h4>
                  <span className="px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 text-[9px] font-semibold">{c.type}</span>
                </div>
                <p className="text-[10px] text-white/40">{c.teamName} • Rank #{c.rank || '—'}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[9px] text-white/30">ID: {c.certificateId}</span>
                  <span className="text-[9px] text-white/30">{new Date(c.issuedAt).toLocaleDateString()}</span>
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-6">No certificates yet. Participate in hackathons to earn them!</p>}
          </div>
        )}

        {/* ── Leaderboard ──────────────────────────────────────────────────── */}
        {tab === 'leaderboard' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Leaderboard</h3>
            {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
              <div key={i} className={`bg-white/5 backdrop-blur rounded-xl p-4 border ${i === 0 ? 'border-yellow-500/30' : i === 1 ? 'border-gray-400/30' : i === 2 ? 'border-orange-700/30' : 'border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-300' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-white/5 text-white/50'}`}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : entry.rank}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">{entry.teamName}</p>
                    {entry.title && <p className="text-[10px] text-white/40">{entry.title}</p>}
                    {entry.techStack?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {entry.techStack.slice(0, 4).map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] text-white/40">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-orange-300">{entry.totalScore} pts</span>
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-6">No leaderboard data yet.</p>}
          </div>
        )}

        {/* ── Detail ───────────────────────────────────────────────────────── */}
        {tab === 'detail' && selectedHackathon && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedHackathon.title}</h3>
                  <p className="text-xs text-white/50 mt-0.5">{selectedHackathon.theme}</p>
                </div>
                <StatusBadge status={selectedHackathon.status} />
              </div>
              {selectedHackathon.description && <p className="text-xs text-white/60 mb-3">{selectedHackathon.description}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-white/40">Type</p><p className="text-xs text-white">{typeIcon(selectedHackathon.type)} {selectedHackathon.type}</p></div>
                <div><p className="text-[10px] text-white/40">Category</p><p className="text-xs text-white">{selectedHackathon.category}</p></div>
                <div><p className="text-[10px] text-white/40">Team Size</p><p className="text-xs text-white">{selectedHackathon.teamSize?.min}–{selectedHackathon.teamSize?.max}</p></div>
                <div><p className="text-[10px] text-white/40">Max Participants</p><p className="text-xs text-white">{selectedHackathon.maxParticipants}</p></div>
                {selectedHackathon.startDate && <div><p className="text-[10px] text-white/40">Start</p><p className="text-xs text-white">{new Date(selectedHackathon.startDate).toLocaleDateString()}</p></div>}
                {selectedHackathon.endDate && <div><p className="text-[10px] text-white/40">End</p><p className="text-xs text-white">{new Date(selectedHackathon.endDate).toLocaleDateString()}</p></div>}
              </div>
            </div>

            {selectedHackathon.prizes?.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Prizes</h4>
                {selectedHackathon.prizes.map((p, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-xs text-white/70">#{p.rank} {p.title}</span>
                    <span className="text-xs text-yellow-300 font-medium">{p.value}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedHackathon.problems?.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Challenges ({selectedHackathon.problems.length})</h4>
                {selectedHackathon.problems.map((p, i) => (
                  <div key={i} className="py-2 border-b border-white/5 last:border-0">
                    <div className="flex justify-between"><span className="text-xs text-white">{p.title}</span><span className="text-[9px] text-orange-300">{p.points} pts</span></div>
                    <span className={`text-[9px] ${p.difficulty === 'hard' ? 'text-red-400' : p.difficulty === 'expert' ? 'text-purple-400' : p.difficulty === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>{p.difficulty}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {(selectedHackathon.status === 'registration' || selectedHackathon.status === 'upcoming') && (
                <button onClick={() => handleRegister(selectedHackathon._id)} className="flex-1 py-2.5 rounded-lg bg-orange-600 text-white text-sm font-medium">Register Now</button>
              )}
              <button onClick={() => loadLeaderboard(selectedHackathon._id)} className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/70 text-sm">View Leaderboard</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
