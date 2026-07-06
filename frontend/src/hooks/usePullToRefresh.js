import { useRef, useEffect, useCallback } from 'react';

/**
 * usePullToRefresh — detects pull-down gesture on mobile and triggers a refresh callback.
 * 
 * Usage:
 *   const containerRef = usePullToRefresh({ onRefresh: () => loadData(), threshold: 80 });
 *   return <div ref={containerRef}>...</div>
 */
export function usePullToRefresh({ onRefresh, threshold = 80, disabled = false }) {
  const containerRef = useRef(null);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    // Only trigger if scrolled to top
    const el = containerRef.current;
    if (!el || el.scrollTop > 5) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [disabled]);

  const handleTouchEnd = useCallback((e) => {
    if (!pulling.current) return;
    pulling.current = false;
    const endY = e.changedTouches[0].clientY;
    const diff = endY - startY.current;
    if (diff > threshold) {
      onRefresh?.();
    }
  }, [onRefresh, threshold]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return containerRef;
}

export default usePullToRefresh;
