import type { MembershipSubscriptionStatus } from "@gym/shared";
import {
  DuplicateActiveSubscriptionError,
  type CreateMembershipPlanInput,
  type CreateSubscriptionInput,
  type MembershipPlanRecord,
  type MembershipRepository,
  type MembershipSubscriptionRecord,
  type UpdateMembershipPlanInput
} from "../src/repositories/membership.repository.js";

export class InMemoryMembershipRepository implements MembershipRepository {
  public readonly plans = new Map<string, MembershipPlanRecord>();
  public readonly subscriptions = new Map<string, MembershipSubscriptionRecord>();

  private sequence = 0;

  public async createPlan(input: CreateMembershipPlanInput): Promise<MembershipPlanRecord> {
    const now = new Date();
    const plan: MembershipPlanRecord = {
      id: this.nextId("plan"),
      name: input.name,
      durationDays: input.durationDays,
      priceCents: input.priceCents,
      ptIncluded: input.ptIncluded,
      lockerIncluded: input.lockerIncluded,
      guestPassesIncluded: input.guestPassesIncluded,
      accessTiming: input.accessTiming ?? null,
      gracePeriodDays: input.gracePeriodDays,
      freezeAllowed: input.freezeAllowed,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  public async listPlans(includeInactive: boolean): Promise<MembershipPlanRecord[]> {
    return [...this.plans.values()].filter((plan) => includeInactive || plan.isActive);
  }

  public async findPlanById(id: string): Promise<MembershipPlanRecord | null> {
    return this.plans.get(id) ?? null;
  }

  public async updatePlan(id: string, input: UpdateMembershipPlanInput): Promise<MembershipPlanRecord> {
    const plan = this.requirePlan(id);
    const updated: MembershipPlanRecord = {
      ...plan,
      ...input,
      updatedAt: new Date()
    };
    this.plans.set(id, updated);
    return updated;
  }

  public async createSubscription(input: CreateSubscriptionInput): Promise<MembershipSubscriptionRecord> {
    const hasActive = [...this.subscriptions.values()].some(
      (subscription) => subscription.memberId === input.memberId && subscription.status === "ACTIVE"
    );
    if (hasActive) {
      throw new DuplicateActiveSubscriptionError();
    }

    const plan = this.requirePlan(input.planId);
    const now = new Date();
    const subscription: MembershipSubscriptionRecord = {
      id: this.nextId("sub"),
      memberId: input.memberId,
      planId: input.planId,
      planName: plan.name,
      planFreezeAllowed: plan.freezeAllowed,
      planGracePeriodDays: plan.gracePeriodDays,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "ACTIVE",
      freezeStartDate: null,
      freezeEndDate: null,
      priceAtPurchaseCents: input.priceAtPurchaseCents,
      createdAt: now,
      updatedAt: now
    };
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  public async listSubscriptionsForMember(memberId: string): Promise<MembershipSubscriptionRecord[]> {
    return [...this.subscriptions.values()]
      .filter((subscription) => subscription.memberId === memberId)
      .sort((left, right) => right.startDate.getTime() - left.startDate.getTime());
  }

  public async findSubscriptionForMember(memberId: string, subscriptionId: string): Promise<MembershipSubscriptionRecord | null> {
    const subscription = this.subscriptions.get(subscriptionId);
    return subscription?.memberId === memberId ? subscription : null;
  }

  public async findOpenSubscriptionForMember(memberId: string): Promise<MembershipSubscriptionRecord | null> {
    return (
      [...this.subscriptions.values()].find(
        (subscription) =>
          subscription.memberId === memberId && (subscription.status === "ACTIVE" || subscription.status === "FROZEN")
      ) ?? null
    );
  }

  public async findAccessSubscriptionForMember(memberId: string, at: Date): Promise<MembershipSubscriptionRecord | null> {
    return (
      [...this.subscriptions.values()]
        .filter((subscription) => subscription.memberId === memberId && subscription.status === "ACTIVE")
        .find((subscription) => subscriptionAccessEndsAt(subscription) >= at) ?? null
    );
  }

  public async expireSubscriptionsPastGrace(at: Date): Promise<MembershipSubscriptionRecord[]> {
    const expired: MembershipSubscriptionRecord[] = [];
    for (const subscription of this.subscriptions.values()) {
      if (subscription.status === "ACTIVE" && subscriptionAccessEndsAt(subscription) < at) {
        const updated: MembershipSubscriptionRecord = {
          ...subscription,
          status: "EXPIRED",
          updatedAt: new Date()
        };
        this.subscriptions.set(updated.id, updated);
        expired.push(updated);
      }
    }
    return expired;
  }

  public async listExpiringSoon(startInclusive: Date, endExclusive: Date): Promise<MembershipSubscriptionRecord[]> {
    return [...this.subscriptions.values()]
      .filter(
        (subscription) =>
          subscription.status === "ACTIVE" && subscription.endDate >= startInclusive && subscription.endDate < endExclusive
      )
      .sort((left, right) => left.endDate.getTime() - right.endDate.getTime());
  }

  public async updateSubscription(
    id: string,
    input: {
      status?: MembershipSubscriptionStatus;
      endDate?: Date;
      freezeStartDate?: Date | null;
      freezeEndDate?: Date | null;
    }
  ): Promise<MembershipSubscriptionRecord> {
    const subscription = this.requireSubscription(id);
    const updated: MembershipSubscriptionRecord = {
      ...subscription,
      ...input,
      updatedAt: new Date()
    };
    this.subscriptions.set(id, updated);
    return updated;
  }

  private requirePlan(id: string): MembershipPlanRecord {
    const plan = this.plans.get(id);
    if (!plan) {
      throw new Error("Plan not found");
    }
    return plan;
  }

  private requireSubscription(id: string): MembershipSubscriptionRecord {
    const subscription = this.subscriptions.get(id);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    return subscription;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}

function subscriptionAccessEndsAt(subscription: MembershipSubscriptionRecord): Date {
  return new Date(subscription.endDate.getTime() + subscription.planGracePeriodDays * 24 * 60 * 60 * 1000);
}
