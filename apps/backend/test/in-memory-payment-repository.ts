import type { InvoiceStatus, PaymentAnalyticsRange, PaymentMethod } from "@gym/shared";
import {
  RefundAmountExceededError,
  RemainingBalanceExceededError,
  type CreateInvoiceInput,
  type InvoiceRecord,
  type PaymentRecord,
  type PaymentRepository,
  type RecordPaymentInput,
  type RefundPaymentInput,
  type RefundRecord,
  type RevenueEventRecord
} from "../src/repositories/payment.repository.js";

export class InMemoryPaymentRepository implements PaymentRepository {
  public readonly invoices = new Map<string, StoredInvoice>();
  public readonly payments = new Map<string, PaymentRecord>();
  public readonly refunds = new Map<string, RefundRecord>();

  private sequence = 0;

  public async createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
    const now = new Date();
    const invoice: StoredInvoice = {
      id: this.nextId("invoice"),
      memberId: input.memberId,
      subscriptionId: input.subscriptionId ?? null,
      amountDueCents: input.amountDueCents,
      status: "PENDING",
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now
    };
    this.invoices.set(invoice.id, invoice);
    return this.hydrateInvoice(invoice.id);
  }

  public async cancelOpenInvoicesForSubscription(subscriptionId: string): Promise<InvoiceRecord[]> {
    for (const invoice of this.invoices.values()) {
      if (invoice.subscriptionId === subscriptionId && (invoice.status === "PENDING" || invoice.status === "PARTIALLY_PAID")) {
        this.invoices.set(invoice.id, {
          ...invoice,
          status: "CANCELLED",
          updatedAt: new Date()
        });
      }
    }
    return [...this.invoices.values()]
      .filter((invoice) => invoice.subscriptionId === subscriptionId)
      .map((invoice) => this.hydrateInvoice(invoice.id))
      .sort((left, right) => right.dueDate.getTime() - left.dueDate.getTime());
  }

  public async findInvoiceById(id: string): Promise<InvoiceRecord | null> {
    return this.invoices.has(id) ? this.hydrateInvoice(id) : null;
  }

  public async listInvoicesForMember(memberId: string): Promise<InvoiceRecord[]> {
    return [...this.invoices.values()]
      .filter((invoice) => invoice.memberId === memberId)
      .map((invoice) => this.hydrateInvoice(invoice.id))
      .sort((left, right) => right.dueDate.getTime() - left.dueDate.getTime());
  }

  public async listPendingDues(): Promise<InvoiceRecord[]> {
    return [...this.invoices.values()]
      .map((invoice) => this.hydrateInvoice(invoice.id))
      .filter((invoice) => (invoice.status === "PENDING" || invoice.status === "PARTIALLY_PAID") && invoice.remainingCents > 0)
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
  }

  public async recordPayment(input: RecordPaymentInput): Promise<InvoiceRecord> {
    const invoice = this.requireStoredInvoice(input.invoiceId);
    const currentPaid = this.effectivePaidCents(input.invoiceId);
    const remaining = Math.max(0, invoice.amountDueCents - currentPaid);
    if (input.amountCents > remaining) {
      throw new RemainingBalanceExceededError(remaining);
    }

    const now = new Date();
    const payment: PaymentRecord = {
      id: this.nextId("payment"),
      invoiceId: input.invoiceId,
      amountCents: input.amountCents,
      method: input.method,
      paidAt: input.paidAt ?? now,
      recordedBy: input.recordedBy,
      refundableCents: input.amountCents,
      refunds: [],
      createdAt: now
    };
    this.payments.set(payment.id, payment);
    this.saveStatus(input.invoiceId);
    return this.hydrateInvoice(input.invoiceId);
  }

  public async refundPayment(input: RefundPaymentInput): Promise<InvoiceRecord> {
    const payment = this.payments.get(input.paymentId);
    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    const existingRefunds = this.refundsForPayment(payment.id);
    const refundableCents = payment.amountCents - existingRefunds.reduce((total, refund) => total + refund.amountCents, 0);
    if (input.amountCents > refundableCents) {
      throw new RefundAmountExceededError(refundableCents);
    }

    const refund: RefundRecord = {
      id: this.nextId("refund"),
      paymentId: payment.id,
      amountCents: input.amountCents,
      reason: input.reason,
      refundedBy: input.refundedBy,
      refundedAt: input.refundedAt ?? new Date()
    };
    this.refunds.set(refund.id, refund);
    this.saveStatus(payment.invoiceId);
    return this.hydrateInvoice(payment.invoiceId);
  }

  public async listPaymentsForMember(memberId: string): Promise<PaymentRecord[]> {
    const invoiceIds = new Set([...this.invoices.values()].filter((invoice) => invoice.memberId === memberId).map((invoice) => invoice.id));
    return [...this.payments.values()]
      .filter((payment) => invoiceIds.has(payment.invoiceId))
      .map((payment) => this.hydratePayment(payment.id))
      .sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime());
  }

  public async listRecentPayments(limit: number): Promise<PaymentRecord[]> {
    return [...this.payments.values()]
      .map((payment) => this.hydratePayment(payment.id))
      .sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime())
      .slice(0, limit);
  }

  public async listRevenueEvents(range: PaymentAnalyticsRange, now: Date): Promise<RevenueEventRecord[]> {
    const { start, end } = rangeBounds(range, now);
    return [
      ...[...this.payments.values()]
        .filter((payment) => payment.paidAt >= start && payment.paidAt < end)
        .map((payment) => ({ amountCents: payment.amountCents, occurredAt: payment.paidAt })),
      ...[...this.refunds.values()]
        .filter((refund) => refund.refundedAt >= start && refund.refundedAt < end)
        .map((refund) => ({ amountCents: -refund.amountCents, occurredAt: refund.refundedAt }))
    ];
  }

  private hydrateInvoice(id: string): InvoiceRecord {
    const invoice = this.requireStoredInvoice(id);
    const amountPaidCents = this.effectivePaidCents(id);
    return {
      ...invoice,
      amountPaidCents,
      remainingCents: Math.max(0, invoice.amountDueCents - amountPaidCents),
      payments: [...this.payments.values()]
        .filter((payment) => payment.invoiceId === id)
        .map((payment) => this.hydratePayment(payment.id))
        .sort((left, right) => left.paidAt.getTime() - right.paidAt.getTime())
    };
  }

  private hydratePayment(id: string): PaymentRecord {
    const payment = this.payments.get(id);
    if (!payment) {
      throw new Error("Payment not found");
    }
    const refunds = this.refundsForPayment(id);
    const refundedCents = refunds.reduce((total, refund) => total + refund.amountCents, 0);
    return {
      ...payment,
      refundableCents: payment.amountCents - refundedCents,
      refunds
    };
  }

  private effectivePaidCents(invoiceId: string): number {
    return [...this.payments.values()]
      .filter((payment) => payment.invoiceId === invoiceId)
      .reduce((total, payment) => total + payment.amountCents - this.refundsForPayment(payment.id).reduce((sum, refund) => sum + refund.amountCents, 0), 0);
  }

  private refundsForPayment(paymentId: string): RefundRecord[] {
    return [...this.refunds.values()].filter((refund) => refund.paymentId === paymentId);
  }

  private saveStatus(invoiceId: string): void {
    const invoice = this.requireStoredInvoice(invoiceId);
    const paid = this.effectivePaidCents(invoiceId);
    const refunded = [...this.refunds.values()]
      .filter((refund) => this.payments.get(refund.paymentId)?.invoiceId === invoiceId)
      .reduce((total, refund) => total + refund.amountCents, 0);
    const status: InvoiceStatus = paid <= 0 ? (refunded > 0 ? "REFUNDED" : "PENDING") : paid >= invoice.amountDueCents ? "PAID" : "PARTIALLY_PAID";
    this.invoices.set(invoiceId, {
      ...invoice,
      status,
      updatedAt: new Date()
    });
  }

  private requireStoredInvoice(id: string): StoredInvoice {
    const invoice = this.invoices.get(id);
    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }
    return invoice;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}

interface StoredInvoice {
  id: string;
  memberId: string;
  subscriptionId: string | null;
  amountDueCents: number;
  status: InvoiceStatus;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

function rangeBounds(range: PaymentAnalyticsRange, now: Date): { start: Date; end: Date } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (range === "daily") {
    return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (range === "weekly") {
    return { start: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (range === "monthly") {
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    };
  }
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
    end: new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1))
  };
}
