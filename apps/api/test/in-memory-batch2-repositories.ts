import type { ReportRepository, CountRow, GrowthRetentionRecord, MoneyRow, TrainerPerformanceRecord } from "../src/repositories/report.repository.js";
import type {
  CreateNotificationInput,
  NotificationListFilters,
  NotificationRecord,
  NotificationRepository
} from "../src/repositories/notification.repository.js";
import type { SettingRecord, SettingsRepository } from "../src/repositories/settings.repository.js";
import type { ActivityLogRepository, AuditLogListFilters, AuditLogRecord } from "../src/repositories/activity-log.repository.js";

export class InMemoryActivityLogRepository implements ActivityLogRepository {
  public readonly logs: AuditLogRecord[] = [];

  public async list(filters: AuditLogListFilters): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const rows = this.logs
      .filter((log) => !filters.userId || log.userId === filters.userId)
      .filter((log) => !filters.action || log.action.toLowerCase().includes(filters.action.toLowerCase()))
      .filter((log) => !filters.entity || log.entity === filters.entity)
      .filter((log) => !filters.from || log.createdAt >= filters.from)
      .filter((log) => !filters.to || log.createdAt < filters.to)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return {
      logs: rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize),
      total: rows.length
    };
  }

  public async recent(limit: number): Promise<AuditLogRecord[]> {
    return this.logs.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).slice(0, limit);
  }
}

export class InMemoryNotificationRepository implements NotificationRepository {
  public readonly notifications = new Map<string, NotificationRecord>();
  private sequence = 0;

  public async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const notification: NotificationRecord = {
      id: this.nextId(),
      userId: input.userId ?? null,
      title: input.title,
      body: input.body,
      category: input.category,
      priority: input.priority,
      readAt: null,
      createdAt: new Date()
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  public async findById(id: string): Promise<NotificationRecord | null> {
    return this.notifications.get(id) ?? null;
  }

  public async list(filters: NotificationListFilters): Promise<{ notifications: NotificationRecord[]; total: number }> {
    const rows = [...this.notifications.values()]
      .filter((notification) => !filters.userId || notification.userId === null || notification.userId === filters.userId)
      .filter((notification) => !filters.unreadOnly || notification.readAt === null)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return {
      notifications: rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize),
      total: rows.length
    };
  }

  public async markRead(id: string, readAt: Date): Promise<NotificationRecord> {
    const notification = this.notifications.get(id);
    if (!notification) {
      throw new Error("Notification not found");
    }
    const updated = { ...notification, readAt };
    this.notifications.set(id, updated);
    return updated;
  }

  public async unreadCount(userId?: string | undefined): Promise<number> {
    return [...this.notifications.values()].filter(
      (notification) => notification.readAt === null && (!userId || notification.userId === null || notification.userId === userId)
    ).length;
  }

  private nextId(): string {
    this.sequence += 1;
    return `notification-${this.sequence}`;
  }
}

export class InMemorySettingsRepository implements SettingsRepository {
  public readonly settings = new Map<string, SettingRecord>();

  public async list(): Promise<SettingRecord[]> {
    return [...this.settings.values()].sort((left, right) => left.key.localeCompare(right.key));
  }

  public async find(key: string): Promise<SettingRecord | null> {
    return this.settings.get(key) ?? null;
  }

  public async upsert(key: string, value: unknown, updatedBy: string): Promise<SettingRecord> {
    const now = new Date();
    const existing = this.settings.get(key);
    const setting: SettingRecord = {
      key,
      value,
      updatedBy,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    this.settings.set(key, setting);
    return setting;
  }
}

export class InMemoryReportRepository implements ReportRepository {
  public membershipRows: CountRow[] = [];
  public invoiceRows: MoneyRow[] = [];
  public trainerRows: TrainerPerformanceRecord[] = [];
  public growthRows: GrowthRetentionRecord[] = [];

  public async membershipStatusCounts(): Promise<CountRow[]> {
    return this.membershipRows;
  }

  public async invoiceStatusTotals(): Promise<MoneyRow[]> {
    return this.invoiceRows;
  }

  public async trainerPerformance(): Promise<TrainerPerformanceRecord[]> {
    return this.trainerRows;
  }

  public async memberGrowthByMonth(_startInclusive: Date, _endExclusive: Date): Promise<GrowthRetentionRecord[]> {
    return this.growthRows;
  }
}
