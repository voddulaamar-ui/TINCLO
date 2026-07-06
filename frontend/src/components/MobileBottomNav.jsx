import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * MobileBottomNav — fixed bottom navigation bar for mobile screens.
 * Only renders on screens < 768px (hidden via CSS on md+).
 */
const MobileBottomNav = () => {
  const location = useLocation();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; }
  }, []);

  if (!currentUser) return null;

  const isRecruiter = currentUser.role === 'recruiter';

  const candidateItems = [
    { to: '/dashboard', icon: '🏠', label: 'Home' },
    { to: '/jobs',      icon: '💼', label: 'Jobs' },
    { to: '/saved-jobs',icon: '🔖', label: 'Saved' },
    { to: '/analytics', icon: '📈', label: 'Stats' },
    { to: '/profile',   icon: '👤', label: 'Profile' },
  ];

  const recruiterItems = [
    { to: '/recruiter', icon: '🏠', label: 'Home' },
    { to: '/companies', icon: '🏢', label: 'Companies' },
    { to: '/analytics', icon: '📊', label: 'Analytics' },
    { to: '/profile',   icon: '👤', label: 'Profile' },
  ];

  const items = isRecruiter ? recruiterItems : candidateItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[300] bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] md:hidden safe-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map(({ to, icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 no-underline transition-all rounded-xl ${
                isActive
                  ? 'text-indigo-600 scale-110'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
