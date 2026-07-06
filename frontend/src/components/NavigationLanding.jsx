import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Notifications from './Notifications';
import ApiService from '../services/ApiService';

const NOTIF_KEY = 'tinclo_notifications';

const getUnreadCount = () => {
  try {
    const stored = localStorage.getItem(NOTIF_KEY);
    if (stored) return JSON.parse(stored).filter(n => !n.read).length;
  } catch {}
  return 0;
};

const NavigationLanding = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const menuRef   = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');

  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [unreadCount,       setUnreadCount]        = useState(getUnreadCount);
  const [darkMode,          setDarkMode]           = useState(
    () => localStorage.getItem('tinclo_dark_mode') === 'true'
  );

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  // Sync unread count when notification panel closes or storage changes
  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
    setUnreadCount(getUnreadCount());
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === NOTIF_KEY) setUnreadCount(getUnreadCount());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Dark mode — toggle html class and persist
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      localStorage.setItem('tinclo_dark_mode', 'true');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('tinclo_dark_mode', 'false');
    }
  }, [darkMode]);

  // Poll server unread count
  useEffect(() => {
    if (!currentUser) return;
    const token = localStorage.getItem('tinclo_token');
    if (!token) return;
    ApiService.getNotifications({ unread: 'true', limit: 1 })
      .then(data => { if (data?.unreadCount !== undefined) setUnreadCount(data.unreadCount); })
      .catch(() => {});
  }, []); // eslint-disable-line

  const handleLogout = () => {
    localStorage.removeItem('tinclo_current_user');
    localStorage.removeItem('tinclo_token');
    localStorage.removeItem('tinclo_admin_session');
    navigate('/');
  };

  const isRecruiter = currentUser?.role === 'recruiter';
  const isAdmin     = currentUser?.role === 'admin' || localStorage.getItem('tinclo_admin_session') === 'true';

  // Nav links per role
  const candidateLinks = [
    { to: '/jobs',       label: 'Browse Jobs' },
    { to: '/dashboard',  label: 'Dashboard'   },
    { to: '/saved-jobs', label: '🔖 Saved'    },
    { to: '/companies',  label: '🏢 Companies' },
    { to: '/analytics',  label: '📈 Analytics' },
  ];
  const recruiterLinks = [
    { to: '/recruiter', label: '🏢 Dashboard'  },
    { to: '/analytics', label: '📈 Analytics'  },
    { to: '/companies', label: '🏢 Companies'  },
  ];
  const adminLinks = [
    { to: '/admin', label: '⚙️ Admin Panel' },
  ];

  const navLinks = isAdmin ? adminLinks : isRecruiter ? recruiterLinks : candidateLinks;

  const desktopLinkCls =
    'text-sm font-semibold text-white px-4 py-2 rounded-full bg-white/15 border border-white/25 no-underline transition-all hover:bg-white/25 hover:-translate-y-0.5';

  const mobileLinkCls =
    'block px-4 py-3 text-sm font-semibold text-white rounded-xl bg-white/10 hover:bg-white/20 no-underline transition-all';

  return (
    <>
      <nav
        ref={menuRef}
        className="fixed top-0 left-0 right-0 z-[200] backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.15)]"
        style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.97) 0%, rgba(118,75,162,0.97) 100%)' }}
      >
        {/* ── Main bar ── */}
        <div className="flex items-center justify-between px-5 py-3">

          {/* Logo */}
          <Link to="/" className="text-xl font-black text-white no-underline tracking-wide hover:opacity-90 transition-opacity flex-shrink-0">
            💼 TINCLO
          </Link>

          {/* Desktop centre links */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 flex-1 justify-center flex-wrap">
              {navLinks.map(({ to, label }) => (
                <Link key={to} to={to} className={desktopLinkCls}>{label}</Link>
              ))}
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(v => !v)}
              title={darkMode ? 'Light mode' : 'Dark mode'}
              aria-label="Toggle dark mode"
              className="w-8 h-8 rounded-full bg-white/15 border border-white/25 text-white text-sm flex items-center justify-center transition-all hover:bg-white/25 hover:scale-110 cursor-pointer"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {currentUser ? (
              <>
                {/* Notification bell */}
                <button
                  onClick={() => setShowNotifications(v => !v)}
                  aria-label="Notifications"
                  className="relative w-8 h-8 rounded-full bg-white/15 border border-white/25 text-white text-sm flex items-center justify-center transition-all hover:bg-white/25 hover:scale-110 cursor-pointer"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-[17px] h-[17px] bg-red-400 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Profile — hidden on very small screens */}
                <Link
                  to="/profile"
                  className="hidden sm:inline-flex text-sm font-semibold text-white px-4 py-2 rounded-full bg-white/15 border border-white/25 no-underline transition-all hover:bg-white/25 hover:-translate-y-0.5"
                >
                  👤 {currentUser.name.split(' ')[0]}
                </Link>

                {/* Logout — hidden on small screens, in mobile menu instead */}
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-flex text-sm font-bold text-purple-700 bg-white px-4 py-2 rounded-full border-none cursor-pointer transition-all hover:bg-purple-50 hover:-translate-y-0.5 shadow-md"
                >
                  Logout
                </button>

                {/* Hamburger — visible on mobile only */}
                <button
                  onClick={() => setMobileOpen(v => !v)}
                  aria-label="Open menu"
                  className="md:hidden w-8 h-8 rounded-full bg-white/15 border border-white/25 text-white flex items-center justify-center cursor-pointer hover:bg-white/25 transition-all"
                >
                  {mobileOpen ? (
                    /* X icon */
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    /* Burger icon */
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <>
                <Link to="/login"  className="text-sm font-semibold text-white px-4 py-2 rounded-full bg-white/15 border border-white/25 no-underline transition-all hover:bg-white/25 hover:-translate-y-0.5">Login</Link>
                <Link to="/signup" className="text-sm font-bold text-purple-700 bg-white px-4 py-2 rounded-full no-underline transition-all hover:bg-purple-50 hover:-translate-y-0.5 shadow-md">Sign Up</Link>
              </>
            )}
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {mobileOpen && currentUser && (
          <div className="md:hidden px-4 pb-4 space-y-1 border-t border-white/20">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className={mobileLinkCls}>{label}</Link>
            ))}
            <div className="pt-2 border-t border-white/20 space-y-1">
              <Link to="/profile" className={mobileLinkCls}>👤 Profile</Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm font-bold text-red-300 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-none"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {showNotifications && <Notifications onClose={handleCloseNotifications} />}
    </>
  );
};

export default NavigationLanding;
