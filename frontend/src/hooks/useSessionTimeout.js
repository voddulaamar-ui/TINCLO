/**
 * useSessionTimeout
 *
 * Tracks user activity (mouse, keyboard, touch, scroll).
 * - After IDLE_TIMEOUT ms of inactivity → shows a warning modal
 * - After WARNING_DURATION ms more with no activity → auto-logs out
 *
 * Usage:
 *   useSessionTimeout({ onLogout, isActive: !!currentUser })
 */
import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_TIMEOUT    = 9 * 60 * 1000;  // 9 min idle → show warning
const WARNING_DURATION = 1 * 60 * 1000; // 1 min to respond before logout
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function useSessionTimeout({ onLogout, isActive }) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const idleTimer    = useRef(null);
  const warningTimer = useRef(null);
  const countdownRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    clearTimeout(idleTimer.current);
    clearTimeout(warningTimer.current);
    clearInterval(countdownRef.current);
  }, []);

  const doLogout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    onLogout();
  }, [onLogout, clearAllTimers]);

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setSecondsLeft(60);

    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    warningTimer.current = setTimeout(() => {
      doLogout();
    }, WARNING_DURATION);
  }, [doLogout]);

  const resetIdleTimer = useCallback(() => {
    if (!isActive) return;

    clearAllTimers();
    setShowWarning(false);

    idleTimer.current = setTimeout(() => {
      startWarningCountdown();
    }, IDLE_TIMEOUT);
  }, [isActive, clearAllTimers, startWarningCountdown]);

  // Attach / detach activity listeners
  useEffect(() => {
    if (!isActive) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    resetIdleTimer();

    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetIdleTimer, { passive: true })
    );

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetIdleTimer)
      );
    };
  }, [isActive, resetIdleTimer, clearAllTimers]);

  /** Call this when the user clicks "Stay logged in" in the warning modal */
  const stayLoggedIn = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  return { showWarning, secondsLeft, stayLoggedIn, doLogout };
}
