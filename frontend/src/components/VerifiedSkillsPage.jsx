import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

const LevelBadge = ({ level }) => {
  const labels = ['', 'Self Declared', 'Assessment', 'Project', 'Employer', 'Multi-Source'];
  const colors = ['', 'bg-gray-500/20 text-gray-300', 'bg-blue-500/20 text-blue-300', 'bg-purple-500/20 text-purple-300', 'bg-green-500/20 text-green-300', 'bg-yellow-500/20 text-yellow-300'];
  return <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${colors[level] || colors[1]}`}>L{level} {labels[level]}</span>;
};

const StatusDot = ({ status }) => {
  const map = { verified: 'bg-green-400', pending: 'bg-yellow-400', expired: 'bg-red-400', revoked: 'bg-gray-400' };
  return <span className={`w-2 h-2 rounded-full inline-block ${map[status] || 'bg-gray-400'}`} />;
};

const ConfidenceBar = ({ value }) => {
  const color = value >= 80 ? 'from-green-500 to-emerald-400' : value >= 50 ? 'from-yellow-500 to-orange-400' : 'from-red-500 to-orange-500';
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
      <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  );
};

export default function VerifiedSkillsPage() {
  const [tab, setTab] = useState('skills');
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [certificates, setCertificates] = useState(null);
  const [history, setHistory] = useState([]);
  // Verify form
  const [vForm, setVForm] = useState({ skill: '', sourceType: 'assessment', sourceName: '', score: '', evidenceTitle: '', category: '' });

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try { const r = await ApiService.getVerifiedSkills(); setSkills(r.skills || []); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadSkills(); }, [loadSkills]);

  const loadTab = (t) => {
    setTab(t);
    if (t === 'analytics' && !analytics) ApiService.getVerifiedSkillsAnalytics().then(r => setAnalytics(r.analytics)).catch(console.error);
    if (t === 'certificates' && !certificates) ApiService.getVerifiedSkillsCertificates().then(r => setCertificates(r)).catch(console.error);
    if (t === 'history' && !history.length) ApiService.getVerifiedSkillsHistory().then(r => setHistory(r.history || [])).catch(console.error);
  };

  const handleVerify = async () => {
    if (!vForm.skill.trim()) return;
    try {
      await ApiService.verifySkill({ skill: vForm.skill, sourceType: vForm.sourceType, sourceName: vForm.sourceName || undefined, score: parseInt(vForm.score) || 70, evidenceTitle: vForm.evidenceTitle || undefined, category: vForm.category || undefined });
      setVForm({ skill: '', sourceType: 'assessment', sourceName: '', score: '', evidenceTitle: '', category: '' });
      loadSkills();
    } catch (e) { alert(e.message || 'Verification failed'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  );

  const verified = skills.filter(s => s.status === 'verified');
  const pending = skills.filter(s => s.status === 'pending');
  const expired = skills.filter(s => s.status === 'expired');
  const tabs = ['skills', 'verify', 'certificates', 'history', 'analytics'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">✅ Verified Skills</h1>
            <p className="text-xs text-white/50">Trusted credential & skill verification</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-emerald-300">{verified.length}</p>
            <p className="text-[10px] text-white/40">Verified</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => loadTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">

        {/* ── Skills List ──────────────────────────────────────────────────── */}
        {tab === 'skills' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-emerald-300">{verified.length}</p><p className="text-[9px] text-white/40">Verified</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-yellow-300">{pending.length}</p><p className="text-[9px] text-white/40">Pending</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-red-300">{expired.length}</p><p className="text-[9px] text-white/40">Expired</p>
              </div>
            </div>

            {/* Verified skills */}
            {verified.length > 0 && <h3 className="text-xs font-semibold text-white">Verified Skills</h3>}
            {verified.map(s => (
              <div key={s._id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-emerald-500/20">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={s.status} />
                    <h4 className="text-sm font-medium text-white">{s.skill}</h4>
                  </div>
                  <LevelBadge level={s.verificationLevel} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-white/40">Confidence</span>
                  <div className="flex-1"><ConfidenceBar value={s.confidence} /></div>
                  <span className="text-xs font-bold text-emerald-300">{s.confidence}%</span>
                </div>
                {s.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {s.sources.map((src, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] text-white/50">{src.type}: {src.name}</span>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-white/30">{s.lastVerified ? `Last verified: ${new Date(s.lastVerified).toLocaleDateString()}` : ''}</span>
                  {s.certificateId && <span className="text-[9px] text-emerald-400">🔗 {s.certificateId}</span>}
                </div>
              </div>
            ))}

            {/* Pending */}
            {pending.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-white mt-4">Pending Verification</h3>
                {pending.map(s => (
                  <div key={s._id} className="bg-white/5 rounded-xl p-3 border border-yellow-500/20 flex items-center gap-3">
                    <StatusDot status="pending" />
                    <span className="text-xs text-white flex-1">{s.skill}</span>
                    <span className="text-[9px] text-yellow-300">Awaiting</span>
                  </div>
                ))}
              </>
            )}

            {skills.length === 0 && <p className="text-xs text-white/50 text-center py-8">No verified skills yet. Use the Verify tab to add your first.</p>}
          </div>
        )}

        {/* ── Verify Form ──────────────────────────────────────────────────── */}
        {tab === 'verify' && (
          <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white">Add Skill Verification</h3>
            <div>
              <label className="text-xs text-white/60 block mb-1">Skill Name</label>
              <input value={vForm.skill} onChange={e => setVForm(f => ({ ...f, skill: e.target.value }))} placeholder="e.g. React, AWS, Python"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">Verification Source</label>
              <select value={vForm.sourceType} onChange={e => setVForm(f => ({ ...f, sourceType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="assessment">Assessment</option>
                <option value="project">Project</option>
                <option value="employer">Employer</option>
                <option value="certification">Certification</option>
                <option value="hackathon">Hackathon</option>
                <option value="university">University</option>
                <option value="opensource">Open Source</option>
                <option value="mentor">Mentor</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Source Name</label>
                <input value={vForm.sourceName} onChange={e => setVForm(f => ({ ...f, sourceName: e.target.value }))} placeholder="e.g. Company name"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Score (0-100)</label>
                <input value={vForm.score} onChange={e => setVForm(f => ({ ...f, score: e.target.value }))} placeholder="80" type="number"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">Evidence Title (optional)</label>
              <input value={vForm.evidenceTitle} onChange={e => setVForm(f => ({ ...f, evidenceTitle: e.target.value }))} placeholder="e.g. Coding Test, Project Name"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500" />
            </div>
            <button onClick={handleVerify} disabled={!vForm.skill.trim()}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 transition">
              Verify Skill
            </button>
          </div>
        )}

        {/* ── Certificates ─────────────────────────────────────────────────── */}
        {tab === 'certificates' && certificates && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Skill Certificates</h3>
            {certificates.skillCertificates?.length > 0 ? certificates.skillCertificates.map((c, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-xs text-white font-medium">{c.skill}</p>
                  <p className="text-[9px] text-white/40">ID: {c.certificateId} • {c.lastVerified ? new Date(c.lastVerified).toLocaleDateString() : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-300">{c.confidence}%</p>
                  <p className="text-[9px] text-white/30">confidence</p>
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center">No certificates yet.</p>}

            {certificates.badges?.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-white mt-4">Badges</h3>
                {certificates.badges.map((b, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
                    <span className="text-lg">{b.icon || '🏅'}</span>
                    <div><p className="text-xs text-white">{b.title}</p><p className="text-[9px] text-white/40">{b.skills?.join(', ')}</p></div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── History ──────────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Verification History</h3>
            {history.length > 0 ? history.map((h, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-xs text-white">{h.skill} — {h.requestType}</p>
                  <p className="text-[9px] text-white/40">{h.verifierName || h.requestedBy} • {new Date(h.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${h.status === 'approved' ? 'bg-green-500/20 text-green-300' : h.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                  {h.status}
                </span>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-6">No verification history.</p>}
          </div>
        )}

        {/* ── Analytics ────────────────────────────────────────────────────── */}
        {tab === 'analytics' && analytics && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Verification Analytics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-white">{analytics.total}</p><p className="text-[9px] text-white/40">Total</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-emerald-300">{analytics.verified}</p><p className="text-[9px] text-white/40">Verified</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-yellow-300">{analytics.pending}</p><p className="text-[9px] text-white/40">Pending</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-blue-300">{analytics.avgConfidence}%</p><p className="text-[9px] text-white/40">Avg Confidence</p>
              </div>
            </div>
            {analytics.sources && Object.keys(analytics.sources).length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Verification Sources</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.sources).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                    <div key={src} className="flex justify-between items-center">
                      <span className="text-xs text-white/60 capitalize">{src}</span>
                      <span className="text-xs text-emerald-300 font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
