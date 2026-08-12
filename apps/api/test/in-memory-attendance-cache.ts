import type { AttendanceAggregateCache } from "../src/services/attendance-cache.service.js";

export class InMemoryAttendanceCache implements AttendanceAggregateCache {
  public readonly store = new Map<string, unknown>();
  public readonly deletedKeys: string[] = [];

  public async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T | undefined) ?? null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  public async delete(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.deletedKeys.push(key);
      this.store.delete(key);
    }
  }

  public close(): void {
    return;
  }
}
