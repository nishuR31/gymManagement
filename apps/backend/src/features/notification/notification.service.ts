import type {
  NotificationCategory,
  NotificationDto,
  NotificationPriority,
  PaginatedNotificationDto,
  RoleName
} from "@gym/shared";
import { errors } from "../../core/errors/app-error.js";
import type { NotificationRecord, NotificationRepository } from "./notification.repository.js";
import type { AuditWriter } from "../../features/member/member.service.js";
import type { RequestActor, RequestContext } from "../../core/types/auth.js";
import { invalidateDashboardAndReports, type CacheService } from "../../core/cache/cache.service.js";

export class NotificationService {
  public constructor(
    private readonly repository: NotificationRepository,
    private readonly auditWriter: AuditWriter,
    private readonly clock: () => Date = () => new Date(),
    private readonly dashboardReportCache?: CacheService
  ) {}

  public async create(
    input: { userId?: string | undefined; title: string; body: string; category: NotificationCategory; priority: NotificationPriority },
    actor: RequestActor,
    context: RequestContext
  ): Promise<NotificationDto> {
    ensureAdminOrAbove(actor.role);
    const notification = await this.repository.create(input);
    console.info("[notification-email-stub]", {
      userId: notification.userId,
      title: notification.title,
      category: notification.category
    });
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "NOTIFICATION_CREATED",
      entity: "Notification",
      entityId: notification.id,
      metadata: { targetUserId: notification.userId, category: notification.category, priority: notification.priority },
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toNotificationDto(notification);
  }

  public async list(input: { unreadOnly: boolean; page: number; pageSize: number }, actor: RequestActor): Promise<PaginatedNotificationDto> {
    const userId = canReadAll(actor.role) ? undefined : actor.id;
    const result = await this.repository.list({ ...input, userId });
    return {
      data: result.notifications.map(toNotificationDto),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize)
      }
    };
  }

  public async unreadCount(actor: RequestActor): Promise<{ count: number }> {
    const userId = canReadAll(actor.role) ? undefined : actor.id;
    return { count: await this.repository.unreadCount(userId) };
  }

  public async markRead(id: string, actor: RequestActor, context: RequestContext): Promise<NotificationDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw errors.notFound("Notification not found");
    }
    if (!canReadAll(actor.role) && existing.userId !== null && existing.userId !== actor.id) {
      throw errors.forbidden();
    }
    const notification = await this.repository.markRead(id, this.clock());
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "NOTIFICATION_READ",
      entity: "Notification",
      entityId: notification.id,
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toNotificationDto(notification);
  }
}

function toNotificationDto(notification: NotificationRecord): NotificationDto {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    body: notification.body,
    category: notification.category,
    priority: notification.priority,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString()
  };
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }
  throw errors.forbidden();
}

function canReadAll(role: RoleName): boolean {
  return role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF";
}
