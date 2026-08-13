import type { InquiryDto, PublicMembershipPlanDto } from "@gym/shared";
import { api } from "../../services/api";
import { USE_MOCK_API } from "../../utils/env";

export interface PublicInquiryPayload {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export async function listPublicPlans(): Promise<PublicMembershipPlanDto[]> {
  if (USE_MOCK_API) return [];
  const response = await api.get<{ data: PublicMembershipPlanDto[] }>("/public/plans");
  return response.data.data;
}

export async function submitPublicInquiry(payload: PublicInquiryPayload): Promise<InquiryDto> {
  if (USE_MOCK_API) return { id: "mock-inq", status: "RECEIVED", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...payload } as any;
  const response = await api.post<{ inquiry: InquiryDto }>("/public/inquiries", payload);
  return response.data.inquiry;
}
