import type { MembershipPlanDto, MembershipSubscriptionDto } from "@gym/shared";
import { api } from "../../services/api";

export interface MembershipPlanPayload {
  name: string;
  durationDays: number;
  priceCents: number;
  ptIncluded: boolean;
  lockerIncluded: boolean;
  guestPassesIncluded: number;
  accessTiming?: string;
  gracePeriodDays: number;
  freezeAllowed: boolean;
}

export async function listMembershipPlans(includeInactive = false): Promise<MembershipPlanDto[]> {
  const response = await api.get<{ data: MembershipPlanDto[] }>("/membership-plans", {
    params: { includeInactive }
  });
  return response.data.data;
}

export async function createMembershipPlan(payload: MembershipPlanPayload): Promise<MembershipPlanDto> {
  const response = await api.post<{ plan: MembershipPlanDto }>("/membership-plans", payload);
  return response.data.plan;
}

export async function updateMembershipPlan(id: string, payload: Partial<MembershipPlanPayload> & { isActive?: boolean }): Promise<MembershipPlanDto> {
  const response = await api.patch<{ plan: MembershipPlanDto }>(`/membership-plans/${id}`, payload);
  return response.data.plan;
}

export async function deactivateMembershipPlan(id: string): Promise<MembershipPlanDto> {
  const response = await api.post<{ plan: MembershipPlanDto }>(`/membership-plans/${id}/deactivate`);
  return response.data.plan;
}

export async function assignSubscription(
  memberId: string,
  planId: string,
  startDate?: string
): Promise<MembershipSubscriptionDto> {
  const response = await api.post<{ subscription: MembershipSubscriptionDto }>(`/members/${memberId}/subscriptions`, {
    planId,
    ...(startDate ? { startDate } : {})
  });
  return response.data.subscription;
}

export async function listMemberSubscriptions(memberId: string): Promise<MembershipSubscriptionDto[]> {
  const response = await api.get<{ data: MembershipSubscriptionDto[] }>(`/members/${memberId}/subscriptions`);
  return response.data.data;
}

export async function cancelSubscription(memberId: string, subscriptionId: string): Promise<MembershipSubscriptionDto> {
  const response = await api.post<{ subscription: MembershipSubscriptionDto }>(`/members/${memberId}/subscriptions/${subscriptionId}/cancel`);
  return response.data.subscription;
}
