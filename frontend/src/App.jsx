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

// Check if user is logged in
const getCurrentUser = () => {
  const currentUser = localStorage.getItem('tinclo_current_user');
  if (currentUser) {
    try {
      return JSON.parse(currentUser);
    } catch (e) {
      console.error('Error parsing current user:', e);
    }
  }
  return null;
};

export const App = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [stateManager] = useState(() => {
    const user = getCurrentUser();
    return new StateManager(user ? user.id : 'guest', ApiService);
  });
  const [state, setState] = useState(stateManager.getState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── Session timeout ──────────────────────────────────────────────────────
  const handleLogout = () => {
    stateManager.clearMatches();
    localStorage.removeItem('tinclo_current_user');
    localStorage.removeItem('tinclo_token');
    SocketService.disconnect();
    setCurrentUser(null);
    navigate('/');
  };

  const { showWarning, secondsLeft, stayLoggedIn, doLogout } = useSessionTimeout({
    onLogout: handleLogout,
    isActive: !!currentUser,
  });
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [stateManager]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        setError(null);

        const user = getCurrentUser();

        if (user) {
          const storageService = new StorageService();
          const migrationResult = await MigrationService.migrateLocalStorageToDatabase(
            user.id,
            ApiService,
            storageService
          );
          if (!migrationResult.skipped) {
            setMigrationStatus(migrationResult);
          }
          await stateManager.loadMatches();
        }

        await stateManager.loadJobs();
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err.message || 'Failed to load application data. Please refresh the page.');
        setLoading(false);
      }
    };

    initializeApp();
  }, [stateManager]);

  useEffect(() => {
    if (currentUser) {
      SocketService.connect(currentUser.id);

      SocketService.onNotification((notification) => {
        try {
          const stored = JSON.parse(localStorage.getItem('tinclo_notifications') || '[]');
          const newNotif = {
            id: notification.id || Date.now(),
            type: notification.type || 'system',
            title: notification.title,
            message: notification.message,
            time: 'Just now',
            read: false,
            icon: notification.icon || '🔔',
          };
          localStorage.setItem('tinclo_notifications', JSON.stringify([newNotif, ...stored]));
        } catch (e) {
          console.warn('Failed to store notification:', e);
        }
      });

      return () => {
        SocketService.offNotification();
      };
    }
  }, [currentUser]);

  const handleNavigate = (view) => stateManager.switchView(view);

  const handleMatch = async (job) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    try {
      await stateManager.addMatch(job);
      SocketService.emitJobLiked(currentUser.id, job.title, job.company);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSkip = () => stateManager.skipJob();

  const handleApply = async (jobId) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    try {
      await stateManager.markAsApplied(jobId);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUndoApply = async (jobId) => {
    try {
      await stateManager.undoApply(jobId);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="w-[60px] h-[60px] border-[5px] border-white/30 border-t-white rounded-full animate-spin-slow mb-6" />
          <p className="text-lg text-white font-medium my-2.5">Loading Job Swipe Matcher...</p>
          {migrationStatus && (
            <p className="text-sm text-white/80 italic">
              Migrating your saved jobs... ({migrationStatus.success} completed)
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error && !state.jobs.length) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center"
          style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' }}>
          <h2 className="text-white mb-4 text-[2rem] font-bold">Unable to Load Application</h2>
          <p className="text-white/90 mb-6 max-w-[500px] text-[1.1rem]">{error}</p>
          <button
            className="px-8 py-3.5 text-base font-bold bg-white text-[#ee5a24] border-none rounded-xl cursor-pointer transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)]"
            onClick={() => window.location.reload()}
          >Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navigation
        currentView={state.currentView}
        matchCount={state.matches.length}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {error && (
        <div className="text-white px-5 py-3.5 text-center font-semibold animate-slide-down shadow-[0_2px_10px_rgba(238,90,36,0.3)]"
          style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)' }}>
          {error}
        </div>
      )}

      {migrationStatus && migrationStatus.success > 0 && (
        <div className="text-white px-5 py-3.5 text-center font-semibold animate-slide-down"
          style={{ background: 'linear-gradient(135deg, #48bb78, #38a169)' }}>
          Successfully migrated {migrationStatus.success} saved job{migrationStatus.success !== 1 ? 's' : ''} from local storage!
          {migrationStatus.errors > 0 && ` (${migrationStatus.errors} failed)`}
        </div>
      )}

      {/* ── Auth modal ── */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] animate-fade-in backdrop-blur-sm"
          onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-3xl px-10 py-12 max-w-[480px] w-[90%] shadow-[0_30px_80px_rgba(0,0,0,0.4)] relative animate-slide-up text-center border-t-[5px] border-indigo-500"
            onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 bg-gray-50 border-none text-2xl text-gray-500 cursor-pointer w-10 h-10 flex items-center justify-center rounded-full transition-all hover:bg-gray-100 hover:text-gray-700 hover:rotate-90"
              onClick={() => setShowAuthModal(false)}>×</button>
            <h2 className="text-[1.875rem] font-extrabold m-0 mb-4 bg-gradient-to-br from-indigo-500 to-purple-700 bg-clip-text text-transparent">
              Sign Up Required
            </h2>
            <p className="text-base text-gray-500 m-0 mb-8 leading-relaxed">
              You need to create an account to like jobs and apply for positions.
            </p>
            <div className="flex gap-4 mb-6">
              <button
                className="flex-1 py-4 text-base font-bold border-none rounded-xl cursor-pointer transition-all text-white shadow-[0_4px_15px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.5)]"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                onClick={() => navigate('/signup')}>
                Create Account
              </button>
              <button
                className="flex-1 py-4 text-base font-bold bg-white text-indigo-500 border-2 border-indigo-500 rounded-xl cursor-pointer transition-all hover:bg-indigo-50 hover:-translate-y-0.5"
                onClick={() => navigate('/login')}>
                Login
              </button>
            </div>
            <p className="text-sm text-gray-400 m-0">
              Browse jobs freely, but sign up to save your favorites!
            </p>
          </div>
        </div>
      )}

      {/* ── Session timeout warning modal ── */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl px-10 py-10 max-w-[420px] w-[90%] shadow-[0_30px_80px_rgba(0,0,0,0.4)] text-center animate-slide-up">
            {/* Icon + countdown ring */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={secondsLeft <= 15 ? '#fc8181' : '#667eea'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - secondsLeft / 60)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-black ${secondsLeft <= 15 ? 'text-red-500' : 'text-indigo-600'}`}>
                  {secondsLeft}
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 m-0 mb-3">
              ⏱️ Session Expiring
            </h2>
            <p className="text-gray-500 text-base m-0 mb-8 leading-relaxed">
              You've been inactive for a while. Your session will expire in{' '}
              <strong className={secondsLeft <= 15 ? 'text-red-500' : 'text-indigo-600'}>
                {secondsLeft} second{secondsLeft !== 1 ? 's' : ''}
              </strong>.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 py-3.5 text-base font-bold text-white border-none rounded-xl cursor-pointer transition-all shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(102,126,234,0.5)]"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                onClick={stayLoggedIn}
              >
                Stay Logged In
              </button>
              <button
                className="flex-1 py-3.5 text-base font-bold bg-gray-100 text-gray-600 border-none rounded-xl cursor-pointer transition-all hover:bg-gray-200"
                onClick={doLogout}
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 min-h-0 px-5 py-4 ${state.currentView === 'browser' ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf0ff 50%, #f0fff4 100%)' }}>
        {state.currentView === 'browser' ? (
          <JobBrowser
            jobs={state.jobs}
            currentIndex={state.currentJobIndex}
            onMatch={handleMatch}
            onSkip={handleSkip}
            onNavigateToMatches={() => handleNavigate('matches')}
            isAuthenticated={!!currentUser}
            currentUser={currentUser}
            likedJobIds={state.matches.map(m => m.job.id || m.job._id).filter(Boolean)}
          />
        ) : (
          <MatchesView
            matches={state.matches}
            onApply={handleApply}
            onUndoApply={handleUndoApply}
            onNavigateToBrowser={() => handleNavigate('browser')}
            isAuthenticated={!!currentUser}
            currentUser={currentUser}
          />
        )}
      </main>
    </div>
  );
};
