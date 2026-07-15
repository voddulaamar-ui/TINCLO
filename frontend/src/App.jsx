import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { JobBrowser } from './components/JobBrowser';
import { MatchesView } from './components/MatchesView';
import { StateManager } from './state/StateManager';
import { StorageService } from './services/StorageService';
import ApiService from './services/ApiService';
import MigrationService from './services/MigrationService';
import SocketService from './services/SocketService';
import { useSessionTimeout } from './hooks/useSessionTimeout';

// ── Read current user from localStorage ───────────────────────────────────────
const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('tinclo_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const App = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser);

  // ── Redirect recruiters / admins away from the job-browser ────────────────
  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role === 'recruiter') { navigate('/recruiter', { replace: true }); return; }
    if (user?.role === 'admin')     { navigate('/admin',     { replace: true }); return; }
  }, []); // eslint-disable-line

  const [stateManager] = useState(() => {
    const user = getCurrentUser();
    return new StateManager(user ? user.id : 'guest', ApiService);
  });
  const [state, setState]               = useState(stateManager.getState());
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [migrationStatus, setMigration] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── Session timeout ───────────────────────────────────────────────────────
  const handleLogout = () => {
    stateManager.clearMatches();
    localStorage.removeItem('tinclo_current_user');
    localStorage.removeItem('tinclo_token');
    localStorage.removeItem('tinclo_admin_session');
    SocketService.disconnect();
    setCurrentUser(null);
    navigate('/');
  };

  const { showWarning, secondsLeft, stayLoggedIn, doLogout } = useSessionTimeout({
    onLogout: handleLogout,
    isActive: !!currentUser,
  });

  // ── State subscription ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = stateManager.subscribe(s => setState(s));
    return unsub;
  }, [stateManager]);

  // ── Initialise app: migrate + load matches ────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const user = getCurrentUser();
        if (user) {
          try {
            const result = await MigrationService.migrateLocalStorageToDatabase(
              user.id, ApiService, new StorageService()
            );
            if (!result.skipped) setMigration(result);
          } catch { /* migration failure is non-fatal */ }
          await stateManager.loadMatches();
        }
        await stateManager.loadJobs();
      } catch (err) {
        if (!err.message?.includes('token') && !err.message?.includes('Access token')) {
          setError(err.message || 'Failed to load. Please refresh.');
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [stateManager]);

  // ── Socket: notifications + new-job matches ───────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    SocketService.connect(currentUser.id);

    const pushNotif = (n) => {
      try {
        const stored = JSON.parse(localStorage.getItem('tinclo_notifications') || '[]');
        localStorage.setItem('tinclo_notifications', JSON.stringify([{
          id: n.id || Date.now(), type: n.type || 'system',
          title: n.title, message: n.message,
          time: 'Just now', read: false, icon: n.icon || '🔔',
        }, ...stored]));
      } catch { /* ignore */ }
    };

    SocketService.onNotification(pushNotif);
    SocketService.onJobMatch((payload) => pushNotif({
      id: Date.now(), type: 'new_jobs',
      title: payload.title || '💼 New Jobs Available!',
      message: payload.message || 'New opportunities just posted.',
      icon: payload.icon || '💼',
    }));

    return () => {
      SocketService.offNotification();
      SocketService.offJobMatch();
    };
  }, [currentUser]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNavigate = (view) => stateManager.switchView(view);

  const handleMatch = async (job) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    try {
      await stateManager.addMatch(job);
      SocketService.emitJobLiked(currentUser.id, job.title, job.company);
    } catch (err) {
      // Don't show error for token issues — auto-redirect handles it
      if (!err.message?.includes('token')) {
        setError(err.message);
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleSkip = () => stateManager.skipJob();

  const handleApply = async (matchId) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    try { await stateManager.markAsApplied(matchId); }
    catch (err) { if (!err.message?.includes('token') && !err.message?.includes('Session expired')) { setError(err.message); setTimeout(() => setError(null), 5000); } }
  };

  const handleUndoApply = async (matchId) => {
    try { await stateManager.undoApply(matchId); }
    catch (err) { if (!err.message?.includes('token') && !err.message?.includes('Session expired')) { setError(err.message); setTimeout(() => setError(null), 5000); } }
  };

  const handleStatusChange = async (matchId, status) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    try { await stateManager.updateMatchStatus(matchId, status); }
    catch (err) { if (!err.message?.includes('token') && !err.message?.includes('Session expired')) { setError(err.message); setTimeout(() => setError(null), 5000); } }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    try { await stateManager.deleteMatch(matchId); }
    catch (err) { /* silently handled — match already removed locally */ }
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center"
        style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
        <div className="w-14 h-14 border-[5px] border-white/30 border-t-white rounded-full animate-spin mb-6" />
        <p className="text-lg text-white font-medium">Loading TINCLO…</p>
        {migrationStatus && (
          <p className="text-sm text-white/70 mt-2 italic">
            Migrating saved jobs… ({migrationStatus.success} done)
          </p>
        )}
      </div>
    );
  }

  // ── Hard error screen ─────────────────────────────────────────────────────
  if (error && !state.jobs.length && !error.includes('token') && !error.includes('Access token')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center"
        style={{ background: 'linear-gradient(135deg,#ff6b6b 0%,#ee5a24 100%)' }}>
        <h2 className="text-white text-3xl font-bold mb-4">Unable to Load</h2>
        <p className="text-white/90 mb-6 max-w-md">{error}</p>
        <button className="px-8 py-3 bg-white text-orange-500 font-bold rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all shadow-lg"
          onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navigation
        currentView={state.currentView}
        matchCount={state.matches.length}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Inline error banner */}
      {error && (
        <div className="text-white px-5 py-3 text-center font-semibold"
          style={{ background: 'linear-gradient(135deg,#ff6b6b,#ee5a24)' }}>
          {error}
        </div>
      )}

      {/* Migration banner */}
      {migrationStatus?.success > 0 && (
        <div className="text-white px-5 py-3 text-center font-semibold"
          style={{ background: 'linear-gradient(135deg,#48bb78,#38a169)' }}>
          ✅ Migrated {migrationStatus.success} saved job{migrationStatus.success !== 1 ? 's' : ''} to your account!
        </div>
      )}

      {/* ── Auth gate modal ── */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-3xl px-10 py-12 max-w-[480px] w-[90%] shadow-[0_30px_80px_rgba(0,0,0,0.4)] relative text-center border-t-[5px] border-indigo-500"
            onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 bg-gray-50 border-none text-2xl text-gray-400 cursor-pointer w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 hover:rotate-90 transition-all"
              onClick={() => setShowAuthModal(false)}>×</button>
            <h2 className="text-3xl font-extrabold m-0 mb-3 bg-gradient-to-br from-indigo-500 to-purple-700 bg-clip-text text-transparent">
              Sign Up Required
            </h2>
            <p className="text-gray-500 m-0 mb-8">Create an account to save jobs and track applications.</p>
            <div className="flex gap-4 mb-4">
              <button className="flex-1 py-4 font-bold text-white rounded-xl border-none cursor-pointer transition-all hover:-translate-y-0.5 shadow-[0_4px_14px_rgba(102,126,234,0.4)]"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                onClick={() => navigate('/signup')}>Create Account</button>
              <button className="flex-1 py-4 font-bold text-indigo-500 bg-white border-2 border-indigo-500 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all"
                onClick={() => navigate('/login')}>Login</button>
            </div>
            <p className="text-sm text-gray-400">Browse freely — sign up to save your favourites.</p>
          </div>
        </div>
      )}

      {/* ── Session timeout modal ── */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] backdrop-blur-sm">
          <div className="bg-white rounded-3xl px-10 py-10 max-w-[400px] w-[90%] shadow-[0_30px_80px_rgba(0,0,0,0.4)] text-center">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none"
                  stroke={secondsLeft <= 15 ? '#fc8181' : '#667eea'} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - secondsLeft / 60)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear,stroke 0.3s' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-black ${secondsLeft <= 15 ? 'text-red-500' : 'text-indigo-600'}`}>{secondsLeft}</span>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 m-0 mb-3">⏱️ Session Expiring</h2>
            <p className="text-gray-500 m-0 mb-8">
              Your session expires in{' '}
              <strong className={secondsLeft <= 15 ? 'text-red-500' : 'text-indigo-600'}>
                {secondsLeft}s
              </strong>.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-3.5 font-bold text-white border-none rounded-xl cursor-pointer shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 transition-all"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                onClick={stayLoggedIn}>Stay Logged In</button>
              <button className="flex-1 py-3.5 font-bold bg-gray-100 text-gray-600 border-none rounded-xl cursor-pointer hover:bg-gray-200 transition-all"
                onClick={doLogout}>Logout Now</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Views ── */}
      <main className={`flex-1 min-h-0 px-5 py-4 bg-page-light dark:bg-page-dark ${state.currentView === 'browser' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {state.currentView === 'browser' ? (
          <JobBrowser
            onMatch={handleMatch}
            onSkip={handleSkip}
            onNavigateToMatches={() => handleNavigate('matches')}
            currentUser={currentUser}
            likedJobIds={state.matches.map(m => m.job?.id || m.job?._id).filter(Boolean)}
          />
        ) : (
          <MatchesView
            matches={state.matches}
            onApply={handleApply}
            onUndoApply={handleUndoApply}
            onStatusChange={handleStatusChange}
            onDeleteMatch={handleDeleteMatch}
            onNavigateToBrowser={() => handleNavigate('browser')}
            currentUser={currentUser}
          />
        )}
      </main>
    </div>
  );
};
