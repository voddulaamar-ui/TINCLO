import { useEffect, useRef, useCallback } from 'react';

/**
 * useInfiniteScroll — triggers `onLoadMore` when sentinel element enters viewport.
 * 
 * Usage:
 *   const sentinelRef = useInfiniteScroll({ onLoadMore, hasMore, loading });
 *   return <div ref={sentinelRef} /> at the bottom of your list.
 * 
 * @param {object} options
 * @param {function} options.onLoadMore - Called when user scrolls near bottom
 * @param {boolean} options.hasMore - Whether more pages exist
 * @param {boolean} options.loading - Whether a load is in progress (prevents double-fire)
 * @param {number} [options.rootMargin=300] - Pixels before bottom to trigger
 * @returns {React.RefObject} - Attach to a sentinel div at the bottom of the list
 */
export function useInfiniteScroll({ onLoadMore, hasMore, loading, rootMargin = 300 }) {
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const handleIntersect = useCallback(([entry]) => {
    if (entry.isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  useEffect(() => {
    // Disconnect previous observer
    if (observerRef.current) observerRef.current.disconnect();

    if (!sentinelRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: `${rootMargin}px`,
    });
    observerRef.current.observe(sentinelRef.current);

    return () => observerRef.current?.disconnect();
  }, [handleIntersect, hasMore, rootMargin]);

  return sentinelRef;
}

export default useInfiniteScroll;
