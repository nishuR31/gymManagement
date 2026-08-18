import type { DashboardSummaryDto } from "@gym/shared";
import { api } from "../../services/api";

export async function getDashboardSummary(): Promise<DashboardSummaryDto> {
  const response = await api.get<DashboardSummaryDto>("/dashboard/summary");
  return response.data;
}
