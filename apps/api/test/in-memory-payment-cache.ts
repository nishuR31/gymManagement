import type { PaymentAnalyticsCache } from "../src/services/payment-cache.service.js";

export class InMemoryPaymentAnalyticsCache implements PaymentAnalyticsCache {
  public readonly values = new Map<string, unknown>();

  public async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  public async delete(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.values.delete(key);
    }
  }

  public async deleteByPrefix(prefixes: string[]): Promise<void> {
    for (const prefix of prefixes) {
      for (const key of this.values.keys()) {
        if (key.startsWith(prefix)) {
          this.values.delete(key);
        }
      }
    }
  }

  public close(): void {
    return;
  }
}
