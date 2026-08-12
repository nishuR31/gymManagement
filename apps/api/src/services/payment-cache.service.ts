import { Redis } from "ioredis";
import type { Env } from "../config/env.js";

const defaultTtlSeconds = 300;

export interface PaymentAnalyticsCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(keys: string[]): Promise<void>;
  close(): void;
}

export class RedisPaymentAnalyticsCache implements PaymentAnalyticsCache {
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

  public close(): void {
    this.redis.disconnect();
  }
}

export class NullPaymentAnalyticsCache implements PaymentAnalyticsCache {
  public async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  public async set<T>(_key: string, _value: T): Promise<void> {
    return;
  }

  public async delete(_keys: string[]): Promise<void> {
    return;
  }

  public close(): void {
    return;
  }
}

export function paymentAnalyticsCacheKey(range: string): string {
  return `payments:analytics:${range}`;
}
