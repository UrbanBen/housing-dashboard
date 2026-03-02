/**
 * Geometry Cache Utility
 *
 * Caches LGA geometry data in localStorage to avoid repeated expensive queries
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'lga_geometry_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get geometry from cache
 */
export function getGeometryFromCache(lgaName: string): any | null {
  if (typeof window === 'undefined') return null;

  try {
    const cacheKey = CACHE_KEY_PREFIX + lgaName;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - entry.timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(`[Geometry Cache] Hit for ${lgaName}`);
    return entry.data;
  } catch (error) {
    console.error('[Geometry Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Save geometry to cache
 */
export function saveGeometryToCache(lgaName: string, data: any): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheKey = CACHE_KEY_PREFIX + lgaName;
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(entry));
    console.log(`[Geometry Cache] Saved for ${lgaName}`);
  } catch (error) {
    console.error('[Geometry Cache] Error saving cache:', error);
    // If localStorage is full, clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCacheEntries();
      // Try again
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch (e) {
        console.error('[Geometry Cache] Still failed after cleanup:', e);
      }
    }
  }
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCacheEntries(): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            // Remove entries older than cache duration
            if (now - entry.timestamp > CACHE_DURATION) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // If we can't parse it, remove it
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error('[Geometry Cache] Error clearing old entries:', error);
  }
}

/**
 * Clear all geometry cache
 */
export function clearGeometryCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    console.log('[Geometry Cache] Cleared all entries');
  } catch (error) {
    console.error('[Geometry Cache] Error clearing cache:', error);
  }
}
