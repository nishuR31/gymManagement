import type { PrismaClient } from "@prisma/client";

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogListFilters {
  userId?: string | undefined;
  action?: string | undefined;
  entity?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  page: number;
  pageSize: number;
}

export interface ActivityLogRepository {
  list(filters: AuditLogListFilters): Promise<{ logs: AuditLogRecord[]; total: number }>;
  recent(limit: number): Promise<AuditLogRecord[]>;
}

export class PrismaActivityLogRepository implements ActivityLogRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async list(filters: AuditLogListFilters): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const where = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.action ? { action: { contains: filters.action, mode: "insensitive" as const } } : {}),
      ...(filters.entity ? { entity: filters.entity } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lt: filters.to } : {})
            }
          }
        : {})
    };
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      }),
      this.prisma.auditLog.count({ where })
    ]);
    return { logs, total };
  }

  public async recent(limit: number): Promise<AuditLogRecord[]> {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    });
  }
}
