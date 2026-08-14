import type { NotificationCategory, NotificationPriority } from "@gym/shared";
import type { PrismaClient } from "@prisma/client";

export interface NotificationRecord {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId?: string | undefined;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
}

export interface NotificationListFilters {
  userId?: string | undefined;
  unreadOnly: boolean;
  page: number;
  pageSize: number;
}

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationRecord>;
  findById(id: string): Promise<NotificationRecord | null>;
  list(filters: NotificationListFilters): Promise<{ notifications: NotificationRecord[]; total: number }>;
  markRead(id: string, readAt: Date): Promise<NotificationRecord>;
  unreadCount(userId?: string | undefined): Promise<number>;
}

export class PrismaNotificationRepository implements NotificationRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const notification = await this.prisma.notification.create({
      data: {
        title: input.title,
        body: input.body,
        category: input.category,
        priority: input.priority,
        ...(input.userId ? { userId: input.userId } : {})
      }
    });
    return toNotificationRecord(notification);
  }

  public async findById(id: string): Promise<NotificationRecord | null> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    return notification ? toNotificationRecord(notification) : null;
  }

  public async list(filters: NotificationListFilters): Promise<{ notifications: NotificationRecord[]; total: number }> {
    const where = {
      ...(filters.userId ? { OR: [{ userId: filters.userId }, { userId: null }] } : {}),
      ...(filters.unreadOnly ? { readAt: null } : {})
    };
    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      }),
      this.prisma.notification.count({ where })
    ]);
    return { notifications: notifications.map(toNotificationRecord), total };
  }

  public async markRead(id: string, readAt: Date): Promise<NotificationRecord> {
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { readAt }
    });
    return toNotificationRecord(notification);
  }

  public async unreadCount(userId?: string | undefined): Promise<number> {
    return this.prisma.notification.count({
      where: {
        ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
        readAt: null
      }
    });
  }
}

function toNotificationRecord(row: {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  category: string;
  priority: string;
  readAt: Date | null;
  createdAt: Date;
}): NotificationRecord {
  return {
    ...row,
    category: row.category as NotificationCategory,
    priority: row.priority as NotificationPriority
  };
}
