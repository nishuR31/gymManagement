import type { InquiryDto, PublicMembershipPlanDto } from "@gym/shared";
import { api } from "../../services/api";

export interface PublicInquiryPayload {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export async function listPublicPlans(): Promise<PublicMembershipPlanDto[]> {
  const response = await api.get<{ data: PublicMembershipPlanDto[] }>("/public/plans");
  return response.data.data;
}

export async function submitPublicInquiry(payload: PublicInquiryPayload): Promise<InquiryDto> {
  const response = await api.post<{ inquiry: InquiryDto }>("/public/inquiries", payload);
  return response.data.inquiry;
}
