import type { PaymentAnalyticsRange, ReportDto } from "@gym/shared";
import { api } from "../../services/api";

export type ReportType =
  | "revenue"
  | "attendance"
  | "memberships"
  | "inventory"
  | "payments"
  | "trainer-performance"
  | "growth-retention";

export interface ReportParams {
  range?: PaymentAnalyticsRange;
  month?: string;
}

export async function getReport(type: ReportType, params: ReportParams = {}): Promise<ReportDto> {
  const response = await api.get<ReportDto>(`/reports/${type}`, { params });
  return response.data;
}

export async function downloadReportCsv(type: ReportType, params: ReportParams = {}): Promise<Blob> {
  const response = await api.get<Blob>(`/reports/${type}`, {
    params: { ...params, format: "csv" },
    responseType: "blob"
  });
  return response.data;
}
