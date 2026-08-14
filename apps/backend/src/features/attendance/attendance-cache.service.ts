import { Redis } from "ioredis";
import type { Env } from "../../core/config/env.js";

const aggregateCacheTtlSeconds = 300;

export interface AttendanceCacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(keys: string[]): Promise<void>;
  close(): void;
}

export class RedisAttendanceCacheService implements AttendanceCacheService {
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

  public async set<T>(key: string, value: T, ttlSeconds = aggregateCacheTtlSeconds): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  public async delete(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  public close(): void {
    this.redis.disconnect();
  }
}

export class NullAttendanceCacheService implements AttendanceCacheService {
  public async get<T>(): Promise<T | null> {
    return null;
  }

  public async set<T>(): Promise<void> {
    return;
  }

  public async delete(): Promise<void> {
    return;
  }

  public close(): void {
    return;
  }
}

export function attendanceDailyCacheKey(date: string): string {
  return `attendance:daily:${date}`;
}

export function attendanceMonthlyCacheKey(month: string): string {
  return `attendance:monthly:${month}`;
}
