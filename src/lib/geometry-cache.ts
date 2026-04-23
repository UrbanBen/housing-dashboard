/**
 * Geometry Cache Utility
 *
 * Caches LGA geometry data in localStorage to avoid repeated expensive queries
 */

import { createLogger } from './logger';

const logger = createLogger({ prefix: 'Geometry Cache' });

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

    logger.debug(`Cache hit for ${lgaName}`);
    return entry.data;
  } catch (error) {
    logger.error('Error reading cache', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Save geometry to cache
 */
export function saveGeometryToCache(lgaName: string, data: any): void {
  if (typeof window === 'undefined') return;

  const cacheKey = CACHE_KEY_PREFIX + lgaName;
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(entry));
    logger.debug(`Saved cache for ${lgaName}`);
  } catch (error) {
    logger.error('Error saving cache', error instanceof Error ? error : new Error(String(error)));
    // If localStorage is full, clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCacheEntries();
      // Try again
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch (e) {
        logger.error('Still failed after cleanup', e instanceof Error ? e : new Error(String(e)));
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
    logger.error('Error clearing old entries', error instanceof Error ? error : new Error(String(error)));
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
    logger.info('Cleared all entries');
  } catch (error) {
    logger.error('Error clearing cache', error instanceof Error ? error : new Error(String(error)));
  }
}
