import type { InquiryDto, InquiryStatus, PaginatedInquiryDto } from "@gym/shared";
import { api } from "../../services/api";

export interface InquiryListParams {
  status?: InquiryStatus;
  page?: number;
  pageSize?: number;
}

export async function listInquiries(params: InquiryListParams): Promise<PaginatedInquiryDto> {
  const response = await api.get<PaginatedInquiryDto>("/inquiries", { params });
  return response.data;
}

export async function markInquiryRead(id: string): Promise<InquiryDto> {
  const response = await api.post<{ inquiry: InquiryDto }>(`/inquiries/${id}/read`);
  return response.data.inquiry;
}

export async function deleteInquiry(id: string): Promise<InquiryDto> {
  const response = await api.delete<{ inquiry: InquiryDto }>(`/inquiries/${id}`);
  return response.data.inquiry;
}
