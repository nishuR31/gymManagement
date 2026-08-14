import type { AuditLogDto, PaginatedAuditLogDto, RoleName } from "@gym/shared";
import { errors } from "../../core/errors/app-error.js";
import type { ActivityLogRepository, AuditLogListFilters, AuditLogRecord } from "./activity-log.repository.js";
import type { RequestActor } from "../../core/types/auth.js";

export class ActivityLogService {
  public constructor(private readonly repository: ActivityLogRepository) {}

  public async list(filters: AuditLogListFilters, actor: RequestActor): Promise<PaginatedAuditLogDto> {
    ensureAdminOrAbove(actor.role);
    const result = await this.repository.list(filters);
    return {
      data: result.logs.map(toAuditLogDto),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.pageSize)
      }
    };
  }

  public async recent(limit: number, actor: RequestActor): Promise<AuditLogDto[]> {
    ensureStaffOrAbove(actor.role);
    return (await this.repository.recent(limit)).map(toAuditLogDto);
  }
}

export function toAuditLogDto(log: AuditLogRecord): AuditLogDto {
  return {
    id: log.id,
    userId: log.userId,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString()
  };
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }
  throw errors.forbidden();
}

function ensureStaffOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF") {
    return;
  }
  throw errors.forbidden();
}
