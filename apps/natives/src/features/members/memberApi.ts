import type { MemberDto, MemberLoginSetupDto, MemberStatus } from "@gym/shared";
import { api } from "../../services/api";

export interface MemberListResponse {
  data: MemberDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MemberPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
  heightCm?: number;
  weightKg?: number;
}

export interface MemberUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalNotes?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

export interface MemberQrResponse {
  memberId: string;
  memberCode: string;
  qrPayload: string;
}

export async function listMembers(params: {
  page: number;
  pageSize: number;
  status?: MemberStatus;
  search?: string;
}): Promise<MemberListResponse> {
  const response = await api.get<MemberListResponse>("/members", { params });
  return response.data;
}

export async function getCurrentMember(): Promise<MemberDto> {
  const response = await api.get<{ member: MemberDto }>("/members/me");
  return response.data.member;
}

export async function createMember(payload: MemberPayload): Promise<MemberDto> {
  const response = await api.post<{ member: MemberDto }>("/members", payload);
  return response.data.member;
}

export async function updateMember(id: string, payload: MemberUpdatePayload): Promise<MemberDto> {
  const response = await api.patch<{ member: MemberDto }>(`/members/${id}`, payload);
  return response.data.member;
}

export async function archiveMember(id: string): Promise<MemberDto> {
  const response = await api.delete<{ member: MemberDto }>(`/members/${id}`);
  return response.data.member;
}

export async function suspendMember(id: string, reason: string): Promise<MemberDto> {
  const response = await api.post<{ member: MemberDto }>(`/members/${id}/suspend`, { reason });
  return response.data.member;
}

export async function restoreMember(id: string): Promise<MemberDto> {
  const response = await api.post<{ member: MemberDto }>(`/members/${id}/restore`);
  return response.data.member;
}

export async function getMemberQr(id: string): Promise<MemberQrResponse> {
  const response = await api.get<MemberQrResponse>(`/members/${id}/qr`);
  return response.data;
}

export async function regenerateMemberQr(id: string): Promise<MemberQrResponse> {
  const response = await api.post<MemberQrResponse>(`/members/${id}/qr/regenerate`);
  return response.data;
}

export async function createMemberLogin(id: string): Promise<MemberLoginSetupDto> {
  const response = await api.post<{ login: MemberLoginSetupDto }>(`/members/${id}/login`);
  return response.data.login;
}
