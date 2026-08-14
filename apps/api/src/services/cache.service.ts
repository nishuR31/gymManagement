import { Redis } from "ioredis";
import type { Env } from "../config/env.js";

const defaultTtlSeconds = 300;

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(keys: string[]): Promise<void>;
  deleteByPrefix?(prefixes: string[]): Promise<void>;
  close(): void;
}

export class RedisCacheService implements CacheService {
  private l1Cache = new Map<string, string>();
  private l1Ttls = new Map<string, number>();
  private l2Redis: Redis | null = null;

  public constructor(url: string) {
    if (url) {
      this.l2Redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        commandTimeout: 5000,
        retryStrategy: (times) => {
          return Math.min(times * 50, 2000);
        }
      });
      this.l2Redis.on("connection", () => console.log("L2 Redis Cache connected."));

      this.l2Redis.on("error", () => {
        // Ignore connection errors to prevent unhandled rejections
        console.log("Redis connection error, falling back to L1 Memory Cache only.");
        this.l2Redis = null;
      });
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      // 1. Check L1 Memory Cache
      const expiry = this.l1Ttls.get(key);
      if (expiry && Date.now() > expiry) {
        this.l1Cache.delete(key);
        this.l1Ttls.delete(key);
      } else {
        const l1Value = this.l1Cache.get(key);
        if (l1Value) {
          return JSON.parse(l1Value) as T;
        }
      }

      // 2. Check L2 Redis Cache
      if (this.l2Redis) {
        const l2Value = await this.l2Redis.get(key);
        if (l2Value) {
          this.l1Cache.set(key, l2Value);
          this.l1Ttls.set(key, Date.now() + 60000); // 60 seconds L1 TTL for L2 items
          return JSON.parse(l2Value) as T;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds = defaultTtlSeconds): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      this.l1Cache.set(key, stringValue);
      this.l1Ttls.set(key, Date.now() + ttlSeconds * 1000);

      if (this.l2Redis) {
        await this.l2Redis.set(key, stringValue, "EX", ttlSeconds);
      }
    } catch {
      return;
    }
  }

  public async delete(keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        keys.forEach((k) => {
          this.l1Cache.delete(k);
          this.l1Ttls.delete(k);
        });

        if (this.l2Redis) {
          await this.l2Redis.del(...keys);
        }
      }
    } catch {
      return;
    }
  }

  public async deleteByPrefix(prefixes: string[]): Promise<void> {
    try {
      // Clear L1 matches
      for (const key of this.l1Cache.keys()) {
        if (prefixes.some((prefix) => key.startsWith(prefix))) {
          this.l1Cache.delete(key);
          this.l1Ttls.delete(key);
        }
      }

      // Clear L2 matches
      if (this.l2Redis) {
        for (const prefix of prefixes) {
          let cursor = "0";
          do {
            const [nextCursor, keys] = await this.l2Redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
            cursor = nextCursor;
            if (keys.length > 0) {
              await this.l2Redis.del(...keys);
            }
          } while (cursor !== "0");
        }
      }
    } catch {
      return;
    }
  }

  public close(): void {
    if (this.l2Redis) {
      this.l2Redis.disconnect();
    }
  }
}

export class NullCacheService implements CacheService {
  public async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  public async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    return;
  }

  public async delete(_keys: string[]): Promise<void> {
    return;
  }

  public async deleteByPrefix(_prefixes: string[]): Promise<void> {
    return;
  }

  public close(): void {
    return;
  }
}

// Key Builders
export const dashboardSummaryCacheKey = "dashboard:summary";
export const reportCachePrefix = "reports:";
export const inventoryLowStockCacheKey = "inventory:low-stock";
export const inventoryValuationCacheKey = "inventory:valuation";

export function attendanceDailyCacheKey(date: string): string {
  return `attendance:daily:${date}`;
}

export function attendanceMonthlyCacheKey(month: string): string {
  return `attendance:monthly:${month}`;
}

export function paymentAnalyticsCacheKey(range: string): string {
  return `payments:analytics:${range}`;
}

export async function invalidateDashboardAndReports(cache: CacheService | undefined): Promise<void> {
  if (!cache) {
    return;
  }
  try {
    await cache.delete([dashboardSummaryCacheKey]);
    if (cache.deleteByPrefix) {
      await cache.deleteByPrefix([reportCachePrefix]);
    }
  } catch {
    return;
  }
}
