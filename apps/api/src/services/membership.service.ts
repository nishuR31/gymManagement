import type { MembershipPlanDto, MembershipSubscriptionDto, RoleName } from "@gym/shared";
import { AppError, errors } from "../errors/app-error.js";
import type { AuditLogInput } from "../repositories/auth.repository.js";
import type { MemberRecord, MemberRepository } from "../repositories/member.repository.js";
import {
  DuplicateActiveSubscriptionError,
  type CreateMembershipPlanInput,
  type MembershipPlanRecord,
  type MembershipRepository,
  type MembershipSubscriptionRecord,
  type UpdateMembershipPlanInput
} from "../repositories/membership.repository.js";
import type { PaymentRepository } from "../repositories/payment.repository.js";
import type { RequestActor, RequestContext } from "../types/auth.js";
import { addDays } from "../utils/dates.js";
import { invalidateDashboardAndReports, type AggregateCache } from "./aggregate-cache.service.js";

export interface AuditWriter {
  writeAuditLog(input: AuditLogInput): Promise<void>;
}

export interface AssignSubscriptionInput {
  planId: string;
  startDate?: Date;
}

export class MembershipService {
  public constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly memberRepository: MemberRepository,
    private readonly auditWriter: AuditWriter,
    private readonly clock: () => Date = () => new Date(),
    private readonly dashboardReportCache?: AggregateCache,
    private readonly paymentRepository?: PaymentRepository
  ) {}

  public async createPlan(
    input: CreateMembershipPlanInput,
    actor: RequestActor,
    context: RequestContext
  ): Promise<MembershipPlanDto> {
    ensureAdminOrAbove(actor.role);
    const plan = await this.membershipRepository.createPlan(input);
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBERSHIP_PLAN_CREATED",
      entity: "MembershipPlan",
      entityId: plan.id,
      ...context
    });
    await invalidateDashboardAndReports(this.dashboardReportCache);
    return toPlanDto(plan);
  }

  public async listPlans(actor: RequestActor, includeInactive: boolean): Promise<MembershipPlanDto[]> {
    ensureAdminOrAbove(actor.role);
    const plans = await this.membershipRepository.listPlans(includeInactive);
    return plans.map(toPlanDto);
  }

  public async updatePlan(
    id: string,
    input: UpdateMembershipPlanInput,
    actor: RequestActor,
    context: RequestContext
  ): Promise<MembershipPlanDto> {
    ensureAdminOrAbove(actor.role);
    await this.findPlanOrThrow(id);
    const plan = await this.membershipRepository.updatePlan(id, input);
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBERSHIP_PLAN_UPDATED",
      entity: "MembershipPlan",
      entityId: plan.id,
      ...context
    });
    await invalidateDashboardAndReports(this.dashboardReportCache);
    return toPlanDto(plan);
  }

  public async deactivatePlan(id: string, actor: RequestActor, context: RequestContext): Promise<MembershipPlanDto> {
    ensureAdminOrAbove(actor.role);
    await this.findPlanOrThrow(id);
    const plan = await this.membershipRepository.updatePlan(id, { isActive: false });
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBERSHIP_PLAN_DEACTIVATED",
      entity: "MembershipPlan",
      entityId: plan.id,
      ...context
    });
    await invalidateDashboardAndReports(this.dashboardReportCache);
    return toPlanDto(plan);
  }

  public async assignSubscription(
    memberId: string,
    input: AssignSubscriptionInput,
    actor: RequestActor,
    context: RequestContext
  ): Promise<MembershipSubscriptionDto> {
    ensureAdminOrAbove(actor.role);
    await this.findMemberOrThrow(memberId);
    const plan = await this.findPlanOrThrow(input.planId);

    if (!plan.isActive) {
      throw new AppError(409, "MEMBERSHIP_PLAN_INACTIVE", "Inactive plans cannot be assigned");
    }

    const startDate = input.startDate ?? this.clock();
    const openSubscription = await this.membershipRepository.findOpenSubscriptionForMember(memberId);
    if (openSubscription?.status === "FROZEN") {
      throw new AppError(409, "ACTIVE_SUBSCRIPTION_EXISTS", "Member already has an active or frozen subscription");
    }

    if (openSubscription?.status === "ACTIVE") {
      if (openSubscription.endDate >= startDate) {
        throw new AppError(409, "ACTIVE_SUBSCRIPTION_EXISTS", "Member already has an active subscription");
      }

      await this.membershipRepository.updateSubscription(openSubscription.id, {
        status: "EXPIRED"
      });
    }

    try {
      const subscription = await this.membershipRepository.createSubscription({
        memberId,
        planId: plan.id,
        startDate,
        endDate: addDays(startDate, plan.durationDays),
        priceAtPurchaseCents: plan.priceCents
      });
      await this.auditWriter.writeAuditLog({
        userId: actor.id,
        action: "MEMBERSHIP_SUBSCRIPTION_ASSIGNED",
        entity: "MembershipSubscription",
        entityId: subscription.id,
        metadata: {
          memberId,
          planId: plan.id,
          priceAtPurchaseCents: plan.priceCents
        },
        ...context
      });
      await this.paymentRepository?.createInvoice({
        memberId,
        subscriptionId: subscription.id,
        amountDueCents: plan.priceCents,
        dueDate: startDate
      });
      await invalidateDashboardAndReports(this.dashboardReportCache);
      return toSubscriptionDto(subscription);
    } catch (error: unknown) {
      if (error instanceof DuplicateActiveSubscriptionError) {
        throw new AppError(409, "ACTIVE_SUBSCRIPTION_EXISTS", "Member already has an active subscription");
      }
      throw error;
    }
  }

  public async listSubscriptions(memberId: string, actor: RequestActor): Promise<MembershipSubscriptionDto[]> {
    const member = await this.findMemberOrThrow(memberId);
    ensureCanReadSubscriptionHistory(member, actor);
    const subscriptions = await this.membershipRepository.listSubscriptionsForMember(memberId);
    return subscriptions.map(toSubscriptionDto);
  }

  public async listExpiringSoon(days: number, actor: RequestActor): Promise<MembershipSubscriptionDto[]> {
    ensureStaffOrAbove(actor.role);
    const start = this.clock();
    const end = addDays(start, days);
    const subscriptions = await this.membershipRepository.listExpiringSoon(start, end);
    return subscriptions.map(toSubscriptionDto);
  }

  public async expireSubscriptionsPastGrace(actor?: RequestActor, context: RequestContext = {}): Promise<MembershipSubscriptionDto[]> {
    const expired = await this.membershipRepository.expireSubscriptionsPastGrace(this.clock());
    for (const subscription of expired) {
      await this.auditWriter.writeAuditLog({
        ...(actor ? { userId: actor.id } : {}),
        action: "MEMBERSHIP_SUBSCRIPTION_EXPIRED",
        entity: "MembershipSubscription",
        entityId: subscription.id,
        metadata: {
          memberId: subscription.memberId,
          planId: subscription.planId
        },
        ...context
      });
    }
    await invalidateDashboardAndReports(this.dashboardReportCache);
    return expired.map(toSubscriptionDto);
  }

  public async freezeSubscription(
    memberId: string,
    subscriptionId: string,
    actor: RequestActor,
    context: RequestContext
  ): Promise<MembershipSubscriptionDto> {
    ensureAdminOrAbove(actor.role);
    const subscription = await this.findSubscriptionOrThrow(memberId, subscriptionId);

    if (!subscription.planFreezeAllowed) {
      throw new AppError(409, "PLAN_FREEZE_NOT_ALLOWED", "This membership plan does not allow freezing");
    }

    if (subscription.status !== "ACTIVE") {
      throw new AppError(409, "SUBSCRIPTION_NOT_ACTIVE", "Only active subscriptions can be frozen");
    }

    if (subscription.freezeStartDate || subscription.freezeEndDate) {
      throw new AppError(409, "SUBSCRIPTION_FREEZE_ALREADY_USED", "This subscription has already used its freeze");
    }

    const frozen = await this.membershipRepository.updateSubscription(subscription.id, {
      status: "FROZEN",
      freezeStartDate: this.clock()
    });
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBERSHIP_SUBSCRIPTION_FROZEN",
      entity: "MembershipSubscription",
      entityId: frozen.id,
      metadata: { memberId },
      ...context
    });
    await invalidateDashboardAndReports(this.dashboardReportCache);
    return toSubscriptionDto(frozen);
  }

  public async unfreezeSubscription(
    memberId: string,
    subscriptionId: string,
    actor: RequestActor,
    context: RequestContext
  ): Promise<MembershipSubscriptionDto> {
    ensureAdminOrAbove(actor.role);
    const subscription = await this.findSubscriptionOrThrow(memberId, subscriptionId);

    if (subscription.status !== "FROZEN" || !subscription.freezeStartDate || subscription.freezeEndDate) {
      throw new AppError(409, "SUBSCRIPTION_NOT_FROZEN", "Subscription is not currently frozen");
    }

    const freezeEndDate = this.clock();
    const frozenMs = Math.max(0, freezeEndDate.getTime() - subscription.freezeStartDate.getTime());
    const endDate = new Date(subscription.endDate.getTime() + frozenMs);
    const unfrozen = await this.membershipRepository.updateSubscription(subscription.id, {
      status: "ACTIVE",
      freezeEndDate,
      endDate
    });
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBERSHIP_SUBSCRIPTION_UNFROZEN",
      entity: "MembershipSubscription",
      entityId: unfrozen.id,
      metadata: {
        memberId,
        frozenMinutes: Math.round(frozenMs / 60000)
      },
      ...context
    });
    await invalidateDashboardAndReports(this.dashboardReportCache);
    return toSubscriptionDto(unfrozen);
  }

  public async cancelSubscription(
    memberId: string,
    subscriptionId: string,
    actor: RequestActor,
    context: RequestContext
  ): Promise<MembershipSubscriptionDto> {
    ensureAdminOrAbove(actor.role);
    const subscription = await this.findSubscriptionOrThrow(memberId, subscriptionId);

    if (subscription.status === "CANCELLED") {
      throw new AppError(409, "SUBSCRIPTION_ALREADY_CANCELLED", "Subscription is already cancelled");
    }

    const cancelled = await this.membershipRepository.updateSubscription(subscription.id, {
      status: "CANCELLED"
    });
    await this.paymentRepository?.cancelOpenInvoicesForSubscription(subscription.id);
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBERSHIP_SUBSCRIPTION_CANCELLED",
      entity: "MembershipSubscription",
      entityId: cancelled.id,
      metadata: { memberId, planId: cancelled.planId },
      ...context
    });
    await invalidateDashboardAndReports(this.dashboardReportCache);
    return toSubscriptionDto(cancelled);
  }

  private async findPlanOrThrow(id: string): Promise<MembershipPlanRecord> {
    const plan = await this.membershipRepository.findPlanById(id);
    if (!plan) {
      throw errors.notFound("Membership plan not found");
    }
    return plan;
  }

  private async findMemberOrThrow(id: string): Promise<MemberRecord> {
    const member = await this.memberRepository.findById(id);
    if (!member) {
      throw errors.notFound("Member not found");
    }
    return member;
  }

  private async findSubscriptionOrThrow(memberId: string, subscriptionId: string): Promise<MembershipSubscriptionRecord> {
    const subscription = await this.membershipRepository.findSubscriptionForMember(memberId, subscriptionId);
    if (!subscription) {
      throw errors.notFound("Membership subscription not found");
    }
    return subscription;
  }
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }

  throw errors.forbidden();
}

function ensureStaffOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF") {
    return;
  }

  throw errors.forbidden();
}

function ensureCanReadSubscriptionHistory(member: MemberRecord, actor: RequestActor): void {
  if (actor.role === "SUPER_ADMIN" || actor.role === "GYM_OWNER" || actor.role === "ADMIN" || actor.role === "STAFF") {
    return;
  }

  if (actor.role === "MEMBER" && member.userId === actor.id) {
    return;
  }

  throw errors.forbidden();
}

function toPlanDto(plan: MembershipPlanRecord): MembershipPlanDto {
  return {
    id: plan.id,
    name: plan.name,
    durationDays: plan.durationDays,
    priceCents: plan.priceCents,
    ptIncluded: plan.ptIncluded,
    lockerIncluded: plan.lockerIncluded,
    guestPassesIncluded: plan.guestPassesIncluded,
    accessTiming: plan.accessTiming,
    gracePeriodDays: plan.gracePeriodDays,
    freezeAllowed: plan.freezeAllowed,
    isActive: plan.isActive,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString()
  };
}

function toSubscriptionDto(subscription: MembershipSubscriptionRecord): MembershipSubscriptionDto {
  return {
    id: subscription.id,
    memberId: subscription.memberId,
    planId: subscription.planId,
    planName: subscription.planName,
    startDate: subscription.startDate.toISOString().slice(0, 10),
    endDate: subscription.endDate.toISOString().slice(0, 10),
    status: subscription.status,
    freezeStartDate: subscription.freezeStartDate?.toISOString() ?? null,
    freezeEndDate: subscription.freezeEndDate?.toISOString() ?? null,
    priceAtPurchaseCents: subscription.priceAtPurchaseCents,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString()
  };
}
