import type { MembershipSubscriptionStatus } from "@gym/shared";
import type { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export class DuplicateActiveSubscriptionError extends Error {
  public constructor() {
    super("Member already has an active subscription");
  }
}

export interface MembershipPlanRecord {
  id: string;
  name: string;
  durationDays: number;
  priceCents: number;
  ptIncluded: boolean;
  lockerIncluded: boolean;
  guestPassesIncluded: number;
  accessTiming: string | null;
  gracePeriodDays: number;
  freezeAllowed: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipSubscriptionRecord {
  id: string;
  memberId: string;
  planId: string;
  planName: string;
  planFreezeAllowed: boolean;
  planGracePeriodDays: number;
  startDate: Date;
  endDate: Date;
  status: MembershipSubscriptionStatus;
  freezeStartDate: Date | null;
  freezeEndDate: Date | null;
  priceAtPurchaseCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMembershipPlanInput {
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

export interface UpdateMembershipPlanInput {
  name?: string;
  durationDays?: number;
  priceCents?: number;
  ptIncluded?: boolean;
  lockerIncluded?: boolean;
  guestPassesIncluded?: number;
  accessTiming?: string | null;
  gracePeriodDays?: number;
  freezeAllowed?: boolean;
  isActive?: boolean;
}

export interface CreateSubscriptionInput {
  memberId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  priceAtPurchaseCents: number;
}

export interface MembershipRepository {
  createPlan(input: CreateMembershipPlanInput): Promise<MembershipPlanRecord>;
  listPlans(includeInactive: boolean): Promise<MembershipPlanRecord[]>;
  findPlanById(id: string): Promise<MembershipPlanRecord | null>;
  updatePlan(id: string, input: UpdateMembershipPlanInput): Promise<MembershipPlanRecord>;
  createSubscription(input: CreateSubscriptionInput): Promise<MembershipSubscriptionRecord>;
  listSubscriptionsForMember(memberId: string): Promise<MembershipSubscriptionRecord[]>;
  findSubscriptionForMember(memberId: string, subscriptionId: string): Promise<MembershipSubscriptionRecord | null>;
  findOpenSubscriptionForMember(memberId: string): Promise<MembershipSubscriptionRecord | null>;
  findAccessSubscriptionForMember(memberId: string, at: Date): Promise<MembershipSubscriptionRecord | null>;
  expireSubscriptionsPastGrace(at: Date): Promise<MembershipSubscriptionRecord[]>;
  listExpiringSoon(startInclusive: Date, endExclusive: Date): Promise<MembershipSubscriptionRecord[]>;
  updateSubscription(
    id: string,
    input: {
      status?: MembershipSubscriptionStatus;
      endDate?: Date;
      freezeStartDate?: Date | null;
      freezeEndDate?: Date | null;
    }
  ): Promise<MembershipSubscriptionRecord>;
}

export class PrismaMembershipRepository implements MembershipRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createPlan(input: CreateMembershipPlanInput): Promise<MembershipPlanRecord> {
    const plan = await this.prisma.membershipPlan.create({
      data: input
    });
    return toPlanRecord(plan);
  }

  public async listPlans(includeInactive: boolean): Promise<MembershipPlanRecord[]> {
    const plans = await this.prisma.membershipPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: "desc" }
    });
    return plans.map(toPlanRecord);
  }

  public async findPlanById(id: string): Promise<MembershipPlanRecord | null> {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id }
    });
    return plan ? toPlanRecord(plan) : null;
  }

  public async updatePlan(id: string, input: UpdateMembershipPlanInput): Promise<MembershipPlanRecord> {
    const plan = await this.prisma.membershipPlan.update({
      where: { id },
      data: input
    });
    return toPlanRecord(plan);
  }

  public async createSubscription(input: CreateSubscriptionInput): Promise<MembershipSubscriptionRecord> {
    try {
      const subscription = await this.prisma.membershipSubscription.create({
        data: input,
        include: { plan: true }
      });
      return toSubscriptionRecord(subscription);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new DuplicateActiveSubscriptionError();
      }
      throw error;
    }
  }

  public async listSubscriptionsForMember(memberId: string): Promise<MembershipSubscriptionRecord[]> {
    const subscriptions = await this.prisma.membershipSubscription.findMany({
      where: { memberId },
      include: { plan: true },
      orderBy: { startDate: "desc" }
    });
    return subscriptions.map(toSubscriptionRecord);
  }

  public async findSubscriptionForMember(memberId: string, subscriptionId: string): Promise<MembershipSubscriptionRecord | null> {
    const subscription = await this.prisma.membershipSubscription.findFirst({
      where: { id: subscriptionId, memberId },
      include: { plan: true }
    });
    return subscription ? toSubscriptionRecord(subscription) : null;
  }

  public async findOpenSubscriptionForMember(memberId: string): Promise<MembershipSubscriptionRecord | null> {
    const subscription = await this.prisma.membershipSubscription.findFirst({
      where: {
        memberId,
        status: { in: ["ACTIVE", "FROZEN"] }
      },
      include: { plan: true },
      orderBy: { startDate: "desc" }
    });
    return subscription ? toSubscriptionRecord(subscription) : null;
  }

  public async findAccessSubscriptionForMember(memberId: string, at: Date): Promise<MembershipSubscriptionRecord | null> {
    const subscriptions = await this.prisma.membershipSubscription.findMany({
      where: {
        memberId,
        status: "ACTIVE"
      },
      include: { plan: true },
      orderBy: { endDate: "desc" }
    });

    return subscriptions.map(toSubscriptionRecord).find((subscription) => subscriptionAccessEndsAt(subscription) >= at) ?? null;
  }

  public async expireSubscriptionsPastGrace(at: Date): Promise<MembershipSubscriptionRecord[]> {
    const active = await this.prisma.membershipSubscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true }
    });
    const expiredIds = active
      .map(toSubscriptionRecord)
      .filter((subscription) => subscriptionAccessEndsAt(subscription) < at)
      .map((subscription) => subscription.id);

    if (expiredIds.length === 0) {
      return [];
    }

    const updated = await this.prisma.$transaction(
      expiredIds.map((id) =>
        this.prisma.membershipSubscription.update({
          where: { id },
          data: { status: "EXPIRED" },
          include: { plan: true }
        })
      )
    );
    return updated.map(toSubscriptionRecord);
  }

  public async listExpiringSoon(startInclusive: Date, endExclusive: Date): Promise<MembershipSubscriptionRecord[]> {
    const subscriptions = await this.prisma.membershipSubscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          gte: startInclusive,
          lt: endExclusive
        }
      },
      include: { plan: true },
      orderBy: { endDate: "asc" }
    });
    return subscriptions.map(toSubscriptionRecord);
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
    const subscription = await this.prisma.membershipSubscription.update({
      where: { id },
      data: input,
      include: { plan: true }
    });
    return toSubscriptionRecord(subscription);
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2002";
}

function toPlanRecord(plan: {
  id: string;
  name: string;
  durationDays: number;
  priceCents: number;
  ptIncluded: boolean;
  lockerIncluded: boolean;
  guestPassesIncluded: number;
  accessTiming: string | null;
  gracePeriodDays: number;
  freezeAllowed: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): MembershipPlanRecord {
  return plan;
}

function toSubscriptionRecord(subscription: {
  id: string;
  memberId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  freezeStartDate: Date | null;
  freezeEndDate: Date | null;
  priceAtPurchaseCents: number;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    name: string;
    freezeAllowed: boolean;
    gracePeriodDays: number;
  };
}): MembershipSubscriptionRecord {
  return {
    id: subscription.id,
    memberId: subscription.memberId,
    planId: subscription.planId,
    planName: subscription.plan.name,
    planFreezeAllowed: subscription.plan.freezeAllowed,
    planGracePeriodDays: subscription.plan.gracePeriodDays,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    status: subscription.status as MembershipSubscriptionStatus,
    freezeStartDate: subscription.freezeStartDate,
    freezeEndDate: subscription.freezeEndDate,
    priceAtPurchaseCents: subscription.priceAtPurchaseCents,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  };
}

function subscriptionAccessEndsAt(subscription: MembershipSubscriptionRecord): Date {
  return new Date(subscription.endDate.getTime() + subscription.planGracePeriodDays * 24 * 60 * 60 * 1000);
}
