import React, { useState, useRef, useEffect, memo } from 'react';

/**
 * LazyImage — only loads the image when it enters the viewport.
 * Uses IntersectionObserver for native lazy loading.
 * Shows a placeholder (bg color or skeleton) until loaded.
 */
const LazyImage = memo(({ src, alt = '', className = '', fallback, ...props }) => {
  const [loaded, setLoaded]     = useState(false);
  const [inView, setInView]     = useState(false);
  const [error, setError]       = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // start loading 200px before entering viewport
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  if (!src || error) {
    // Fallback: show first letter or custom fallback
    return (
      <div ref={imgRef} className={`flex items-center justify-center bg-gray-100 text-gray-400 font-bold ${className}`} {...props}>
        {fallback || alt?.charAt(0) || '?'}
      </div>
    );
  }

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`} {...props}>
      {/* Skeleton placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
      {/* Actual image — only set src when in viewport */}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
export default LazyImage;
