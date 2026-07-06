import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

const StatusDot = ({ status }) => {
  const map = { scheduled: 'bg-blue-400', live: 'bg-green-400 animate-pulse', completed: 'bg-gray-400', cancelled: 'bg-red-400' };
  return <span className={`w-2 h-2 rounded-full inline-block ${map[status] || 'bg-gray-400'}`} />;
};

export default function InterviewRoomPage() {
  const [tab, setTab] = useState('rooms');
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [scorecards, setScorecards] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await ApiService.getInterviewRooms({}); setRooms(r.rooms || []); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const viewRoom = async (id) => {
    try {
      const [roomRes, scRes] = await Promise.all([ApiService.getInterviewRoom(id), ApiService.getInterviewScorecards(id)]);
      setSelectedRoom(roomRes.room || null);
      setScorecards(scRes.scorecards || []);
      setTab('detail');
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
    </div>
  );

  const tabs = ['rooms', 'detail'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div><h1 className="text-xl font-bold text-white">🎥 AI Interview Room</h1><p className="text-xs text-white/50">Live coding, whiteboard, video & AI transcripts</p></div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2">
          <button onClick={() => setTab('rooms')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${tab === 'rooms' ? 'bg-green-600 text-white' : 'bg-white/5 text-white/60'}`}>My Interviews</button>
          {selectedRoom && <button onClick={() => setTab('detail')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${tab === 'detail' ? 'bg-green-600 text-white' : 'bg-white/5 text-white/60'}`}>Room Detail</button>}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-4">
        {tab === 'rooms' && (
          <>
            {rooms.length > 0 ? rooms.map(r => (
              <div key={r._id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/8" onClick={() => viewRoom(r._id)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={r.status} />
                    <div><h4 className="text-sm text-white font-medium">{r.title}</h4><p className="text-[10px] text-white/40">{r.type} • {r.candidateName}</p></div>
                  </div>
                  <span className="text-[10px] text-white/30">{new Date(r.scheduledAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  {r.codingEnabled && <span className="text-[9px] text-blue-300">💻 Code</span>}
                  {r.whiteboardEnabled && <span className="text-[9px] text-purple-300">🖊️ Whiteboard</span>}
                  {r.videoEnabled && <span className="text-[9px] text-green-300">📹 Video</span>}
                  {r.aiAssistEnabled && <span className="text-[9px] text-yellow-300">🤖 AI</span>}
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-8">No interview rooms scheduled.</p>}
          </>
        )}

        {tab === 'detail' && selectedRoom && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-white">{selectedRoom.title}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${selectedRoom.status === 'live' ? 'bg-green-500/20 text-green-300' : selectedRoom.status === 'completed' ? 'bg-white/10 text-white/50' : 'bg-blue-500/20 text-blue-300'}`}>{selectedRoom.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div><p className="text-[10px] text-white/40">Candidate</p><p className="text-xs text-white">{selectedRoom.candidateName || '—'}</p></div>
                <div><p className="text-[10px] text-white/40">Type</p><p className="text-xs text-white capitalize">{selectedRoom.type}</p></div>
                <div><p className="text-[10px] text-white/40">Scheduled</p><p className="text-xs text-white">{new Date(selectedRoom.scheduledAt).toLocaleString()}</p></div>
                <div><p className="text-[10px] text-white/40">Duration</p><p className="text-xs text-white">{selectedRoom.duration} min</p></div>
              </div>
              {selectedRoom.interviewers?.length > 0 && (
                <div className="mb-3"><p className="text-[10px] text-white/40 mb-1">Interviewers</p><div className="flex flex-wrap gap-1">{selectedRoom.interviewers.map((iv, i) => <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-white/60 text-[9px]">{iv.name} {iv.isLead ? '👑' : ''}</span>)}</div></div>
              )}
            </div>

            {/* Code snippet */}
            {selectedRoom.codeContent && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Code ({selectedRoom.codeLanguage})</h4>
                <pre className="text-[11px] text-green-300 bg-black/30 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">{selectedRoom.codeContent}</pre>
              </div>
            )}

            {/* AI Summary */}
            {selectedRoom.aiSummary && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">🤖 AI Summary</h4>
                <p className="text-xs text-white/70">{selectedRoom.aiSummary}</p>
                {selectedRoom.aiStrengths?.length > 0 && <div className="mt-2">{selectedRoom.aiStrengths.map((s, i) => <p key={i} className="text-[10px] text-green-300">✓ {s}</p>)}</div>}
                {selectedRoom.aiConcerns?.length > 0 && <div className="mt-1">{selectedRoom.aiConcerns.map((c, i) => <p key={i} className="text-[10px] text-orange-300">⚠ {c}</p>)}</div>}
              </div>
            )}

            {/* Scorecards */}
            {scorecards.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-white mb-2">Scorecards</h4>
                {scorecards.map((sc, i) => (
                  <div key={i} className="py-2 border-b border-white/5 last:border-0">
                    <div className="flex justify-between items-center"><span className="text-xs text-white">{sc.interviewerName}</span><span className="text-xs font-bold text-green-300">{sc.overallScore}/5</span></div>
                    <p className="text-[10px] text-white/40 capitalize">{sc.recommendation?.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {selectedRoom.status === 'scheduled' && <button onClick={async () => { await ApiService.startInterview(selectedRoom._id); viewRoom(selectedRoom._id); }} className="flex-1 py-2 rounded-lg bg-green-600 text-white text-xs font-medium">Start Interview</button>}
              {selectedRoom.status === 'live' && <button onClick={async () => { await ApiService.endInterview(selectedRoom._id); viewRoom(selectedRoom._id); }} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-medium">End Interview</button>}
              {selectedRoom.status === 'completed' && <button onClick={async () => { await ApiService.getInterviewAISummary(selectedRoom._id); viewRoom(selectedRoom._id); }} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-medium">Generate AI Summary</button>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
