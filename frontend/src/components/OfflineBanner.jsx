import React, { useState, useEffect } from 'react';

/**
 * OfflineBanner — shows a banner when the user loses internet connectivity.
 * Auto-hides when connection is restored.
 */
const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => {
      setIsOffline(false);
      // Small delay to show "back online" briefly
      setTimeout(() => setIsOffline(false), 100);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-white"
      style={{ background: 'linear-gradient(135deg, #e53e3e, #c53030)' }}
      role="alert"
      aria-live="assertive"
    >
      <span>📡</span>
      <span>You are currently offline. Some features may be unavailable.</span>
    </div>
  );
};

export default OfflineBanner;
