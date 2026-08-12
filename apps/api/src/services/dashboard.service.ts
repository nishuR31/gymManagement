import type {
  DashboardSummaryDto,
  LowStockProductDto,
  MembershipSubscriptionDto,
  PaymentDto,
  ProductDto,
  RoleName
} from "@gym/shared";
import { errors } from "../errors/app-error.js";
import type { ActivityLogRepository } from "../repositories/activity-log.repository.js";
import type { AttendanceRepository } from "../repositories/attendance.repository.js";
import type { InventoryRepository, ProductRecord } from "../repositories/inventory.repository.js";
import type { MembershipRepository, MembershipSubscriptionRecord } from "../repositories/membership.repository.js";
import type { PaymentRecord, PaymentRepository } from "../repositories/payment.repository.js";
import type { RequestActor } from "../types/auth.js";
import type { AggregateCache } from "./aggregate-cache.service.js";
import { dashboardSummaryCacheKey } from "./aggregate-cache.service.js";
import { toAuditLogDto } from "./activity-log.service.js";

export class DashboardService {
  public constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly cache: AggregateCache,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async summary(actor: RequestActor): Promise<DashboardSummaryDto> {
    ensureStaffOrAbove(actor.role);
    const cacheKey = dashboardSummaryCacheKey;
    const cached = await this.cache.get<DashboardSummaryDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = this.clock();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const [
      currentAttendance,
      todaysAttendance,
      todaysRevenueEvents,
      monthlyRevenueEvents,
      pendingDues,
      expiring,
      recentPayments,
      lowStock,
      recentActivity
    ] = await Promise.all([
      this.attendanceRepository.listCurrent(),
      this.attendanceRepository.getAttendanceForDate(todayStart, tomorrowStart),
      this.paymentRepository.listRevenueEvents("daily", now),
      this.paymentRepository.listRevenueEvents("monthly", now),
      this.paymentRepository.listPendingDues(),
      this.membershipRepository.listExpiringSoon(now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
      this.paymentRepository.listRecentPayments(8),
      this.inventoryRepository.listLowStock(),
      this.activityLogRepository.recent(10)
    ]);

    const result: DashboardSummaryDto = {
      membersCurrentlyInGym: currentAttendance.length,
      todaysAttendance: todaysAttendance.length,
      todaysRevenueCents: todaysRevenueEvents.reduce((total, event) => total + event.amountCents, 0),
      monthlyRevenueCents: monthlyRevenueEvents.reduce((total, event) => total + event.amountCents, 0),
      pendingDuesCents: pendingDues.reduce((total, invoice) => total + invoice.remainingCents, 0),
      pendingDuesCount: pendingDues.length,
      membershipsExpiringSoon: expiring.map(toSubscriptionDto),
      recentPayments: recentPayments.map(toPaymentDto),
      lowStockAlerts: lowStock.map(toProductDto),
      recentActivity: recentActivity.map(toAuditLogDto)
    };

    await this.cache.set(cacheKey, result);
    return result;
  }
}

function ensureStaffOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF") {
    return;
  }
  throw errors.forbidden();
}

function toProductDto(product: ProductRecord): ProductDto | LowStockProductDto {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

function toPaymentDto(payment: PaymentRecord): PaymentDto {
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    amountCents: payment.amountCents,
    method: payment.method,
    paidAt: payment.paidAt.toISOString(),
    recordedBy: payment.recordedBy,
    refundableCents: payment.refundableCents,
    refunds: payment.refunds.map((refund) => ({
      id: refund.id,
      paymentId: refund.paymentId,
      amountCents: refund.amountCents,
      reason: refund.reason,
      refundedBy: refund.refundedBy,
      refundedAt: refund.refundedAt.toISOString()
    })),
    createdAt: payment.createdAt.toISOString()
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
