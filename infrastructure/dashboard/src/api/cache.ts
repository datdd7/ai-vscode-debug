import { CACHE_TTL_MS } from '../config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`dashboard:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(`dashboard:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`dashboard:${key}`, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('dashboard:'));
  keys.forEach(k => localStorage.removeItem(k));
}
