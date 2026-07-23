import { Redis } from "@upstash/redis";

// In-memory LRU fallback cache for local dev / unconfigured environments
class MemoryCache {
  private cache = new Map<string, { value: any; expiresAt: number }>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  set(key: string, value: any, ttlSeconds: number) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    // Enforce max 1000 items in memory
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  del(...keys: string[]) {
    for (const key of keys) {
      this.cache.delete(key);
    }
  }

  delPrefix(prefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

const memoryCache = new MemoryCache();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = (url && token)
  ? new Redis({ url, token })
  : null;

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (redis) {
      return (await redis.get<T>(key)) ?? null;
    }
    return memoryCache.get<T>(key);
  } catch (err) {
    console.error(`[Redis Get Error] ${key}:`, err);
    return memoryCache.get<T>(key);
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  try {
    if (redis) {
      await redis.set(key, value, { ex: ttlSeconds });
    }
    memoryCache.set(key, value, ttlSeconds);
  } catch (err) {
    console.error(`[Redis Set Error] ${key}:`, err);
    memoryCache.set(key, value, ttlSeconds);
  }
}

export async function delCache(...keys: string[]): Promise<void> {
  try {
    if (keys.length === 0) return;
    if (redis) {
      await redis.del(...keys);
    }
    memoryCache.del(...keys);
  } catch (err) {
    console.error(`[Redis Del Error]:`, err);
    memoryCache.del(...keys);
  }
}

export async function delCachePrefix(prefix: string): Promise<void> {
  try {
    memoryCache.delPrefix(prefix);
    if (redis) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (err) {
    console.error(`[Redis DelPrefix Error] ${prefix}:`, err);
  }
}
