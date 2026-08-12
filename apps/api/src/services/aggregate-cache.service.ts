import { Redis } from "ioredis";
import type { Env } from "../config/env.js";

const defaultTtlSeconds = 300;

export interface AggregateCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(keys: string[]): Promise<void>;
  deleteByPrefix?(prefixes: string[]): Promise<void>;
  close(): void;
}

export class RedisAggregateCache implements AggregateCache {
  private readonly redis: Redis;

  public constructor(env: Env) {
    this.redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), "EX", defaultTtlSeconds);
  }

  public async delete(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  public async deleteByPrefix(prefixes: string[]): Promise<void> {
    for (const prefix of prefixes) {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== "0");
    }
  }

  public close(): void {
    this.redis.disconnect();
  }
}

export class NullAggregateCache implements AggregateCache {
  public async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  public async set<T>(_key: string, _value: T): Promise<void> {
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

export const dashboardSummaryCacheKey = "dashboard:summary";
export const reportCachePrefix = "reports:";

export async function invalidateDashboardAndReports(cache: AggregateCache | undefined): Promise<void> {
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
