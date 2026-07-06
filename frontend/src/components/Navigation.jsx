import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Notifications from './Notifications';
import Chat from './Chat';
import { profileCompleteness } from '../services/MatchingService';

const STORAGE_KEY = 'tinclo_notifications';

const getUnreadCount = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored).filter(n => !n.read).length;
  } catch {}
  return 0;
};

export const Navigation = ({ currentView, matchCount, onNavigate, currentUser, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat]                   = useState(false);
  const [unreadCount, setUnreadCount]             = useState(getUnreadCount);
  const [completeness, setCompleteness]           = useState(0);

  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
    setUnreadCount(getUnreadCount());
  }, []);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === STORAGE_KEY) setUnreadCount(getUnreadCount()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Compute profile completeness badge
  useEffect(() => {
    if (!currentUser) { setCompleteness(0); return; }
    try {
      const full = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');
      setCompleteness(profileCompleteness(full));
    } catch {}
  }, [currentUser]);

  const isAdmin     = currentUser?.role === 'admin' || localStorage.getItem('tinclo_admin_session') === 'true';
  const isRecruiter = currentUser?.role === 'recruiter';

  const navBase   = 'flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-full border-2 border-white/20 bg-white/15 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 hover:border-white/40 hover:-translate-y-0.5';
  const navActive = 'bg-white text-indigo-500 border-transparent shadow-md font-bold hover:bg-white hover:text-indigo-500';

  // Completeness ring colour
  const ringColor = completeness >= 80 ? '#48bb78' : completeness >= 50 ? '#f6ad55' : '#fc8181';

  return (
    <>
      <nav className="sticky top-0 z-[100] text-white shadow-[0_4px_20px_rgba(102,126,234,0.4)]"
        style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)' }}>
        <div className="max-w-[1280px] mx-auto px-5 flex justify-between items-center h-[64px] gap-6">

          {/* Logo */}
          <Link to="/" className="text-xl font-black tracking-wide text-white no-underline transition-transform hover:scale-105 flex-shrink-0"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            💼 TINCLO
          </Link>

          {/* Nav links — only for job-seeker view */}
          {!isRecruiter && !isAdmin && (
            <div className="flex gap-2 flex-1 justify-center">
              <button className={`${navBase} ${currentView === 'browser' ? navActive : ''}`} onClick={() => onNavigate('browser')}>Browse Jobs</button>
              <button className={`${navBase} ${currentView === 'matches' ? navActive : ''}`} onClick={() => onNavigate('matches')}>
                Matches
                {matchCount > 0 && (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full min-w-[20px] text-center text-white" style={{ background: 'linear-gradient(135deg,#ff6b6b,#ee5a24)' }}>{matchCount}</span>
                )}
              </button>
              <Link to="/dashboard"
                className={`${navBase} no-underline`}
                title="Dashboard">
                Dashboard
              </Link>
              <Link to="/saved-jobs"
                className={`${navBase} no-underline`}
                title="Saved Jobs">
                🔖 Saved
              </Link>
            </div>
          )}

          {/* Recruiter headline */}
          {isRecruiter && (
            <div className="flex-1 flex justify-center">
              <Link to="/recruiter" className="text-white font-bold text-sm no-underline opacity-90 hover:opacity-100">🏢 Recruiter Dashboard</Link>
            </div>
          )}

          {/* User area */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentUser ? (
              <>
                {/* Chat */}
                <button onClick={() => setShowChat(!showChat)} title="Messages" aria-label="Messages"
                  className="relative w-[36px] h-[36px] rounded-full bg-white/15 border border-white/25 text-white text-sm flex items-center justify-center transition-all hover:bg-white/25 hover:scale-110">💬</button>

                {/* Notifications */}
                <button onClick={() => setShowNotifications(!showNotifications)} title="Notifications" aria-label="Notifications"
                  className="relative w-[36px] h-[36px] rounded-full bg-white/15 border border-white/25 text-white text-sm flex items-center justify-center transition-all hover:bg-white/25 hover:scale-110">
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-[17px] h-[17px] bg-red-400 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>
                  )}
                </button>

                {/* Profile with completeness ring */}
                <Link to="/profile" title="View Profile"
                  className="relative flex items-center gap-2 text-sm font-bold text-white px-3 py-1.5 bg-white/20 rounded-full border border-white/30 no-underline hover:bg-white/30 transition-all">
                  {/* Mini ring around profile link */}
                  {completeness < 80 && (
                    <span className="relative flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
                        <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                        <circle cx="10" cy="10" r="8" fill="none" stroke={ringColor} strokeWidth="2.5"
                          strokeDasharray={`${2 * Math.PI * 8}`}
                          strokeDashoffset={`${2 * Math.PI * 8 * (1 - completeness / 100)}`}
                          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
                      </svg>
                    </span>
                  )}
                  <span>👤 {currentUser.name.split(' ')[0]}</span>
                </Link>

                {/* Analytics (job seekers only) */}
                {!isRecruiter && (
                  <Link to="/analytics" title="Analytics"
                    className="text-sm font-semibold text-white px-3 py-1.5 rounded-full bg-white/15 border border-white/25 no-underline transition-all hover:bg-white/25 hover:-translate-y-0.5">📈</Link>
                )}

                {/* Recruiter dashboard link */}
                {isRecruiter && (
                  <Link to="/recruiter" title="Recruiter Dashboard"
                    className="text-xs font-bold text-white px-3 py-1.5 rounded-full no-underline transition-all hover:-translate-y-0.5 bg-green-500/80 hover:bg-green-600/80">🏢 Dashboard</Link>
                )}

                {/* Admin */}
                {isAdmin && (
                  <Link to="/admin" title="Admin Panel"
                    className="text-xs font-bold text-gray-900 px-3 py-1.5 rounded-full no-underline transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg,#ffd89b,#ff6b6b)' }}>⚙️ Admin</Link>
                )}

                {/* Logout */}
                <button onClick={onLogout}
                  className="bg-white/95 text-purple-700 px-4 py-1.5 text-sm font-bold rounded-full border-none cursor-pointer transition-all hover:bg-white hover:-translate-y-0.5 shadow-md">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login"  className="text-sm font-semibold text-white px-4 py-1.5 rounded-full bg-white/15 border border-white/25 no-underline transition-all hover:bg-white/25">Login</Link>
                <Link to="/signup" className="text-sm font-bold text-purple-700 bg-white px-4 py-1.5 rounded-full no-underline transition-all hover:bg-purple-50 shadow-md">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {showNotifications && <Notifications onClose={handleCloseNotifications} />}
      {showChat && <Chat onClose={() => setShowChat(false)} currentUser={currentUser} />}
    </>
  );
};
