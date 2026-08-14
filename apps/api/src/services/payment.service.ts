import type {
  InvoiceDto,
  PendingDuesDto,
  PaymentAnalyticsDto,
  PaymentAnalyticsRange,
  PaymentDto,
  RoleName
} from "@gym/shared";
import { AppError, errors } from "../errors/app-error.js";
import type { AuditWriter } from "./member.service.js";
import type { MemberRecord, MemberRepository } from "../repositories/member.repository.js";
import type { MembershipRepository } from "../repositories/membership.repository.js";
import {
  RefundAmountExceededError,
  RemainingBalanceExceededError,
  type InvoiceRecord,
  type PaymentRepository
} from "../repositories/payment.repository.js";
import { NullPaymentAnalyticsCache, paymentAnalyticsCacheKey, type PaymentAnalyticsCache } from "./payment-cache.service.js";
import { invalidateDashboardAndReports, type AggregateCache } from "./aggregate-cache.service.js";
import type { RequestActor, RequestContext } from "../types/auth.js";

const paymentRanges: PaymentAnalyticsRange[] = ["daily", "weekly", "monthly", "yearly"];

export interface CreateInvoiceServiceInput {
  subscriptionId?: string | undefined;
  amountDueCents: number;
  dueDate: Date;
}

export interface RecordPaymentServiceInput {
  amountCents: number;
  method: PaymentDto["method"];
  paidAt?: Date | undefined;
}

export interface RefundPaymentServiceInput {
  amountCents: number;
  reason: string;
  refundedAt?: Date | undefined;
}

export class PaymentService {
  public constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly memberRepository: MemberRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly auditWriter: AuditWriter,
    private readonly clock: () => Date = () => new Date(),
    private readonly analyticsCache: PaymentAnalyticsCache = new NullPaymentAnalyticsCache(),
    private readonly dashboardReportCache?: AggregateCache
  ) {}

  public async createInvoice(
    memberId: string,
    input: CreateInvoiceServiceInput,
    actor: RequestActor,
    context: RequestContext
  ): Promise<InvoiceDto> {
    ensureStaffOrAbove(actor.role);
    await this.findMemberOrThrow(memberId);
    if (input.subscriptionId) {
      const subscription = await this.membershipRepository.findSubscriptionForMember(memberId, input.subscriptionId);
      if (!subscription) {
        throw errors.badRequest("Subscription does not belong to this member");
      }
    }

    const invoice = await this.paymentRepository.createInvoice({
      memberId,
      ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {}),
      amountDueCents: input.amountDueCents,
      dueDate: input.dueDate
    });
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "INVOICE_CREATED",
      entity: "Invoice",
      entityId: invoice.id,
      metadata: { memberId, amountDueCents: input.amountDueCents },
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toInvoiceDto(invoice);
  }

  public async getInvoice(id: string, actor: RequestActor): Promise<InvoiceDto> {
    const invoice = await this.findInvoiceOrThrow(id);
    const member = await this.findMemberOrThrow(invoice.memberId);
    ensureCanReadMemberMoney(member, actor);
    return toInvoiceDto(invoice);
  }

  public async recordPayment(
    invoiceId: string,
    input: RecordPaymentServiceInput,
    actor: RequestActor,
    context: RequestContext
  ): Promise<InvoiceDto> {
    ensureStaffOrAbove(actor.role);
    await this.findInvoiceOrThrow(invoiceId);

    try {
      const invoice = await this.paymentRepository.recordPayment({
        invoiceId,
        amountCents: input.amountCents,
        method: input.method,
        recordedBy: actor.id,
        paidAt: input.paidAt ?? this.clock()
      });
      await this.auditWriter.writeAuditLog({
        userId: actor.id,
        action: "PAYMENT_RECORDED",
        entity: "Invoice",
        entityId: invoice.id,
        metadata: {
          amountCents: input.amountCents,
          method: input.method,
          status: invoice.status
        },
        ...context
      });
      await this.invalidatePaymentAnalytics();
      await invalidateDashboardAndReports(this.dashboardReportCache);
      return toInvoiceDto(invoice);
    } catch (error: unknown) {
      if (error instanceof RemainingBalanceExceededError) {
        throw new AppError(409, "REMAINING_BALANCE_EXCEEDED", "Payment exceeds remaining invoice balance", {
          remainingCents: error.remainingCents
        });
      }
      throw error;
    }
  }

  public async refundPayment(
    paymentId: string,
    input: RefundPaymentServiceInput,
    actor: RequestActor,
    context: RequestContext
  ): Promise<InvoiceDto> {
    ensureAdminOrAbove(actor.role);

    try {
      const invoice = await this.paymentRepository.refundPayment({
        paymentId,
        amountCents: input.amountCents,
        reason: input.reason,
        refundedBy: actor.id,
        refundedAt: input.refundedAt ?? this.clock()
      });
      await this.auditWriter.writeAuditLog({
        userId: actor.id,
        action: "PAYMENT_REFUNDED",
        entity: "Payment",
        entityId: paymentId,
        metadata: {
          invoiceId: invoice.id,
          amountCents: input.amountCents,
          reason: input.reason,
          status: invoice.status
        },
        ...context
      });
      await this.invalidatePaymentAnalytics();
      await invalidateDashboardAndReports(this.dashboardReportCache);
      return toInvoiceDto(invoice);
    } catch (error: unknown) {
      if (error instanceof RefundAmountExceededError) {
        throw new AppError(409, "REFUND_AMOUNT_EXCEEDED", "Refund exceeds the remaining refundable payment amount", {
          refundableCents: error.refundableCents
        });
      }
      if (error instanceof Error && error.message === "PAYMENT_NOT_FOUND") {
        throw errors.notFound("Payment not found");
      }
      throw error;
    }
  }

  public async listMemberPayments(memberId: string, actor: RequestActor): Promise<{ data: PaymentDto[] }> {
    const member = await this.findMemberOrThrow(memberId);
    ensureCanReadMemberMoney(member, actor);
    const payments = await this.paymentRepository.listPaymentsForMember(memberId);
    return {
      data: payments.map(toPaymentDto)
    };
  }

  public async listMemberInvoices(memberId: string, actor: RequestActor): Promise<{ data: InvoiceDto[] }> {
    const member = await this.findMemberOrThrow(memberId);
    ensureCanReadMemberMoney(member, actor);
    const invoices = await this.paymentRepository.listInvoicesForMember(memberId);
    return {
      data: invoices.map(toInvoiceDto)
    };
  }

  public async getPendingDues(actor: RequestActor): Promise<PendingDuesDto> {
    ensureAdminOrAbove(actor.role);
    const invoices = await this.paymentRepository.listPendingDues();
    return {
      invoiceCount: invoices.length,
      totalRemainingCents: invoices.reduce((total, invoice) => total + invoice.remainingCents, 0),
      invoices: invoices.map(toInvoiceDto)
    };
  }

  public async getAnalytics(range: PaymentAnalyticsRange, actor: RequestActor): Promise<PaymentAnalyticsDto> {
    ensureAdminOrAbove(actor.role);
    const cacheKey = paymentAnalyticsCacheKey(range);
    const cached = await this.analyticsCache.get<PaymentAnalyticsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = this.clock();
    const events = await this.paymentRepository.listRevenueEvents(range, now);
    const buckets = bucketLabels(range, now).map((label) => ({ label, revenueCents: 0 }));
    const indexByLabel = new Map(buckets.map((bucket, index) => [bucket.label, index]));

    for (const event of events) {
      const label = labelForRange(range, event.occurredAt);
      const index = indexByLabel.get(label);
      if (index !== undefined) {
        const bucket = buckets[index];
        if (bucket) {
          bucket.revenueCents += event.amountCents;
        }
      }
    }

    const result: PaymentAnalyticsDto = {
      range,
      totalRevenueCents: buckets.reduce((total, bucket) => total + bucket.revenueCents, 0),
      buckets
    };
    await this.analyticsCache.set(cacheKey, result);
    return result;
  }

  private async findInvoiceOrThrow(id: string): Promise<InvoiceRecord> {
    const invoice = await this.paymentRepository.findInvoiceById(id);
    if (!invoice) {
      throw errors.notFound("Invoice not found");
    }
    return invoice;
  }

  private async findMemberOrThrow(id: string): Promise<MemberRecord> {
    const member = await this.memberRepository.findById(id);
    if (!member) {
      throw errors.notFound("Member not found");
    }
    return member;
  }

  private async invalidatePaymentAnalytics(): Promise<void> {
    try {
      await this.analyticsCache.delete(paymentRanges.map(paymentAnalyticsCacheKey));
    } catch {
      return;
    }
  }
}

function ensureStaffOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF") {
    return;
  }
  throw errors.forbidden();
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }
  throw errors.forbidden();
}

function ensureCanReadMemberMoney(member: MemberRecord, actor: RequestActor): void {
  if (actor.role === "SUPER_ADMIN" || actor.role === "GYM_OWNER" || actor.role === "ADMIN" || actor.role === "STAFF") {
    return;
  }
  if (actor.role === "MEMBER" && member.userId === actor.id) {
    return;
  }
  throw errors.forbidden();
}

function toInvoiceDto(invoice: InvoiceRecord): InvoiceDto {
  return {
    id: invoice.id,
    memberId: invoice.memberId,
    subscriptionId: invoice.subscriptionId,
    amountDueCents: invoice.amountDueCents,
    amountPaidCents: invoice.amountPaidCents,
    remainingCents: invoice.remainingCents,
    status: invoice.status,
    dueDate: invoice.dueDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    payments: invoice.payments.map(toPaymentDto)
  };
}

function toPaymentDto(payment: {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: PaymentDto["method"];
  paidAt: Date;
  recordedBy: string;
  refundableCents: number;
  refunds: {
    id: string;
    paymentId: string;
    amountCents: number;
    reason: string;
    refundedBy: string;
    refundedAt: Date;
  }[];
  createdAt: Date;
}): PaymentDto {
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

function bucketLabels(range: PaymentAnalyticsRange, now: Date): string[] {
  if (range === "daily") {
    return Array.from({ length: 24 }, (_value, hour) => hour.toString().padStart(2, "0"));
  }
  if (range === "weekly") {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return Array.from({ length: 7 }, (_value, index) =>
      new Date(today.getTime() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    );
  }
  if (range === "monthly") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const labels: string[] = [];
    for (let current = start; current < end; current = new Date(current.getTime() + 24 * 60 * 60 * 1000)) {
      labels.push(current.toISOString().slice(0, 10));
    }
    return labels;
  }
  return Array.from({ length: 12 }, (_value, month) => `${now.getUTCFullYear()}-${String(month + 1).padStart(2, "0")}`);
}

function labelForRange(range: PaymentAnalyticsRange, date: Date): string {
  if (range === "daily") {
    return String(date.getUTCHours()).padStart(2, "0");
  }
  if (range === "yearly") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}
