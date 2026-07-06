/**
 * Simple in-memory cache with TTL (Time To Live).
 * Used for frequently requested data: trending jobs, company list, dashboard stats.
 * Replace with Redis in production for multi-instance deployments.
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get cached value. Returns null if expired or not found.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Set a value with TTL in seconds (default: 60s).
   */
  set(key, value, ttlSeconds = 60) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a specific key.
   */
  del(key) {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /**
   * Clear all cache.
   */
  flush() {
    this.store.clear();
  }

  /**
   * Remove expired entries.
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  /**
   * Get cache stats.
   */
  stats() {
    return { size: this.store.size };
  }
}

// Singleton instance
const cache = new MemoryCache();
export default cache;
