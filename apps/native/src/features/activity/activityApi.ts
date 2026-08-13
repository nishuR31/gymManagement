import type { PaginatedAuditLogDto } from "@gym/shared";
import { api } from "../../services/api";

export interface ActivityLogParams {
  userId?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listActivityLogs(params: ActivityLogParams): Promise<PaginatedAuditLogDto> {
  const response = await api.get<PaginatedAuditLogDto>("/activity-logs", { params });
  return response.data;
}
