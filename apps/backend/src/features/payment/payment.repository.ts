import type { InvoiceStatus, PaymentAnalyticsRange, PaymentMethod } from "@gym/shared";
import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export class RemainingBalanceExceededError extends Error {
  public constructor(public readonly remainingCents: number) {
    super("Payment exceeds remaining invoice balance");
  }
}

export class RefundAmountExceededError extends Error {
  public constructor(public readonly refundableCents: number) {
    super("Refund exceeds refundable payment amount");
  }
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  amountCents: number;
  reason: string;
  refundedBy: string;
  refundedAt: Date;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: PaymentMethod;
  paidAt: Date;
  recordedBy: string;
  refundableCents: number;
  refunds: RefundRecord[];
  createdAt: Date;
}

export interface InvoiceRecord {
  id: string;
  memberId: string;
  subscriptionId: string | null;
  amountDueCents: number;
  amountPaidCents: number;
  remainingCents: number;
  status: InvoiceStatus;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  payments: PaymentRecord[];
}

export interface CreateInvoiceInput {
  memberId: string;
  subscriptionId?: string;
  amountDueCents: number;
  dueDate: Date;
}

export interface RecordPaymentInput {
  invoiceId: string;
  amountCents: number;
  method: PaymentMethod;
  paidAt?: Date;
  recordedBy: string;
}

export interface RefundPaymentInput {
  paymentId: string;
  amountCents: number;
  reason: string;
  refundedBy: string;
  refundedAt?: Date;
}

export interface RevenueEventRecord {
  amountCents: number;
  occurredAt: Date;
}

export interface PaymentRepository {
  createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord>;
  cancelOpenInvoicesForSubscription(subscriptionId: string): Promise<InvoiceRecord[]>;
  findInvoiceById(id: string): Promise<InvoiceRecord | null>;
  listInvoicesForMember(memberId: string): Promise<InvoiceRecord[]>;
  listPendingDues(): Promise<InvoiceRecord[]>;
  summarizePendingDues(): Promise<{ count: number; totalCents: number }>;
  recordPayment(input: RecordPaymentInput): Promise<InvoiceRecord>;
  refundPayment(input: RefundPaymentInput): Promise<InvoiceRecord>;
  listPaymentsForMember(memberId: string): Promise<PaymentRecord[]>;
  listRecentPayments(limit: number): Promise<PaymentRecord[]>;
  listRevenueEvents(range: PaymentAnalyticsRange, now: Date): Promise<RevenueEventRecord[]>;
  sumRevenueEvents(range: PaymentAnalyticsRange, now: Date): Promise<number>;
}

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaPaymentRepository implements PaymentRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
    const invoice = await this.prisma.invoice.create({
      data: {
        memberId: input.memberId,
        amountDueCents: input.amountDueCents,
        dueDate: input.dueDate,
        ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {})
      },
      include: invoiceInclude
    });
    return toInvoiceRecord(invoice);
  }

  public async cancelOpenInvoicesForSubscription(subscriptionId: string): Promise<InvoiceRecord[]> {
    await this.prisma.invoice.updateMany({
      where: {
        subscriptionId,
        status: { in: ["PENDING", "PARTIALLY_PAID"] }
      },
      data: { status: "CANCELLED" }
    });
    const invoices = await this.prisma.invoice.findMany({
      where: { subscriptionId },
      include: invoiceInclude,
      orderBy: { dueDate: "desc" }
    });
    return invoices.map(toInvoiceRecord);
  }

  public async findInvoiceById(id: string): Promise<InvoiceRecord | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude
    });
    return invoice ? toInvoiceRecord(invoice) : null;
  }

  public async listInvoicesForMember(memberId: string): Promise<InvoiceRecord[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { memberId },
      include: invoiceInclude,
      orderBy: { dueDate: "desc" }
    });
    return invoices.map(toInvoiceRecord);
  }

  public async listPendingDues(): Promise<InvoiceRecord[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: ["PENDING", "PARTIALLY_PAID"]
        }
      },
      include: invoiceInclude,
      orderBy: { dueDate: "asc" }
    });
    return invoices.map(toInvoiceRecord).filter((invoice) => invoice.remainingCents > 0);
  }

  public async summarizePendingDues(): Promise<{ count: number; totalCents: number }> {
    const aggregate = await this.prisma.invoice.aggregate({
      where: {
        status: {
          in: ["PENDING", "PARTIALLY_PAID"]
        }
      },
      _sum: {
        amountDueCents: true
      },
      _count: {
        _all: true
      }
    });

    const sumPayments = await this.prisma.payment.aggregate({
      where: {
        invoice: {
          status: {
            in: ["PENDING", "PARTIALLY_PAID"]
          }
        }
      },
      _sum: {
        amountCents: true
      }
    });

    const sumRefunds = await this.prisma.refund.aggregate({
      where: {
        payment: {
          invoice: {
            status: {
              in: ["PENDING", "PARTIALLY_PAID"]
            }
          }
        }
      },
      _sum: {
        amountCents: true
      }
    });

    const totalDue = aggregate._sum.amountDueCents ?? 0;
    const totalPaid = sumPayments._sum.amountCents ?? 0;
    const totalRefunded = sumRefunds._sum.amountCents ?? 0;

    return {
      count: aggregate._count._all,
      totalCents: totalDue - (totalPaid - totalRefunded)
    };
  }

  public async recordPayment(input: RecordPaymentInput): Promise<InvoiceRecord> {
    return this.withSerializableRetry(async () =>
      this.prisma.$transaction(
        async (tx) => {
          await lockInvoice(tx, input.invoiceId);
          const invoice = await requireInvoice(tx, input.invoiceId);
          if (invoice.status === "CANCELLED") {
            throw new RemainingBalanceExceededError(0);
          }

          const currentPaid = effectivePaidCents(invoice);
          const remaining = Math.max(0, invoice.amountDueCents - currentPaid);
          if (input.amountCents > remaining) {
            throw new RemainingBalanceExceededError(remaining);
          }

          await tx.payment.create({
            data: {
              invoiceId: input.invoiceId,
              amountCents: input.amountCents,
              method: input.method,
              recordedBy: input.recordedBy,
              ...(input.paidAt ? { paidAt: input.paidAt } : {})
            }
          });

          const updated = await requireInvoice(tx, input.invoiceId);
          const status = invoiceStatus(updated);
          const saved = await tx.invoice.update({
            where: { id: input.invoiceId },
            data: { status },
            include: invoiceInclude
          });
          return toInvoiceRecord(saved);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );
  }

  public async refundPayment(input: RefundPaymentInput): Promise<InvoiceRecord> {
    return this.withSerializableRetry(async () =>
      this.prisma.$transaction(
        async (tx) => {
          const payment = await tx.payment.findUnique({
            where: { id: input.paymentId },
            include: { refunds: true }
          });
          if (!payment) {
            throw new Error("PAYMENT_NOT_FOUND");
          }

          await lockInvoice(tx, payment.invoiceId);
          const refundableCents = payment.amountCents - payment.refunds.reduce((total, refund) => total + refund.amountCents, 0);
          if (input.amountCents > refundableCents) {
            throw new RefundAmountExceededError(refundableCents);
          }

          await tx.refund.create({
            data: {
              paymentId: input.paymentId,
              amountCents: input.amountCents,
              reason: input.reason,
              refundedBy: input.refundedBy,
              ...(input.refundedAt ? { refundedAt: input.refundedAt } : {})
            }
          });

          const updated = await requireInvoice(tx, payment.invoiceId);
          const status = invoiceStatus(updated);
          const saved = await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: { status },
            include: invoiceInclude
          });
          return toInvoiceRecord(saved);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );
  }

  public async listPaymentsForMember(memberId: string): Promise<PaymentRecord[]> {
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { memberId }
      },
      include: { refunds: true },
      orderBy: { paidAt: "desc" }
    });
    return payments.map(toPaymentRecord);
  }

  public async listRecentPayments(limit: number): Promise<PaymentRecord[]> {
    const payments = await this.prisma.payment.findMany({
      include: { refunds: true },
      orderBy: { paidAt: "desc" },
      take: limit
    });
    return payments.map(toPaymentRecord);
  }

  public async listRevenueEvents(range: PaymentAnalyticsRange, now: Date): Promise<RevenueEventRecord[]> {
    const { start, end } = rangeBounds(range, now);
    const [payments, refunds] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where: {
          paidAt: {
            gte: start,
            lt: end
          }
        },
        select: {
          amountCents: true,
          paidAt: true
        }
      }),
      this.prisma.refund.findMany({
        where: {
          refundedAt: {
            gte: start,
            lt: end
          }
        },
        select: {
          amountCents: true,
          refundedAt: true
        }
      })
    ]);

    return [
      ...payments.map((payment) => ({ amountCents: payment.amountCents, occurredAt: payment.paidAt })),
      ...refunds.map((refund) => ({ amountCents: -refund.amountCents, occurredAt: refund.refundedAt }))
    ];
  }

  public async sumRevenueEvents(range: PaymentAnalyticsRange, now: Date): Promise<number> {
    const { start, end } = rangeBounds(range, now);
    const [payments, refunds] = await this.prisma.$transaction([
      this.prisma.payment.aggregate({
        where: {
          paidAt: {
            gte: start,
            lt: end
          }
        },
        _sum: {
          amountCents: true
        }
      }),
      this.prisma.refund.aggregate({
        where: {
          refundedAt: {
            gte: start,
            lt: end
          }
        },
        _sum: {
          amountCents: true
        }
      })
    ]);

    const totalPaid = payments._sum.amountCents ?? 0;
    const totalRefunded = refunds._sum.amountCents ?? 0;

    return totalPaid - totalRefunded;
  }

  private async withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (error: unknown) {
        if (isSerializationFailure(error) && attempt < 2) {
          continue;
        }
        throw error;
      }
    }
    return operation();
  }
}

const invoiceInclude = {
  payments: {
    include: {
      refunds: true
    },
    orderBy: {
      paidAt: "asc" as const
    }
  }
};

async function lockInvoice(tx: TransactionClient, invoiceId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${invoiceId} FOR UPDATE`;
}

async function requireInvoice(tx: TransactionClient, invoiceId: string): Promise<InvoiceWithPayments> {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: invoiceInclude
  });
  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }
  return invoice;
}

function effectivePaidCents(invoice: InvoiceWithPayments): number {
  return invoice.payments.reduce((total, payment) => total + payment.amountCents - refundTotal(payment.refunds), 0);
}

function refundTotal(refunds: { amountCents: number }[]): number {
  return refunds.reduce((total, refund) => total + refund.amountCents, 0);
}

function invoiceStatus(invoice: InvoiceWithPayments): InvoiceStatus {
  const paid = effectivePaidCents(invoice);
  const refunded = invoice.payments.reduce((total, payment) => total + refundTotal(payment.refunds), 0);

  if (paid <= 0) {
    return refunded > 0 ? "REFUNDED" : "PENDING";
  }

  if (paid >= invoice.amountDueCents) {
    return "PAID";
  }

  return "PARTIALLY_PAID";
}

function toInvoiceRecord(invoice: InvoiceWithPayments): InvoiceRecord {
  const amountPaidCents = effectivePaidCents(invoice);
  return {
    id: invoice.id,
    memberId: invoice.memberId,
    subscriptionId: invoice.subscriptionId,
    amountDueCents: invoice.amountDueCents,
    amountPaidCents,
    remainingCents: Math.max(0, invoice.amountDueCents - amountPaidCents),
    status: invoice.status as InvoiceStatus,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    payments: invoice.payments.map(toPaymentRecord)
  };
}

function toPaymentRecord(payment: PaymentWithRefunds): PaymentRecord {
  const refundedCents = refundTotal(payment.refunds);
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    amountCents: payment.amountCents,
    method: payment.method as PaymentMethod,
    paidAt: payment.paidAt,
    recordedBy: payment.recordedBy,
    refundableCents: payment.amountCents - refundedCents,
    refunds: payment.refunds.map((refund) => ({
      id: refund.id,
      paymentId: refund.paymentId,
      amountCents: refund.amountCents,
      reason: refund.reason,
      refundedBy: refund.refundedBy,
      refundedAt: refund.refundedAt
    })),
    createdAt: payment.createdAt
  };
}

function isSerializationFailure(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2034";
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

type InvoiceWithPayments = {
  id: string;
  memberId: string;
  subscriptionId: string | null;
  amountDueCents: number;
  status: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  payments: PaymentWithRefunds[];
};

type PaymentWithRefunds = {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: string;
  paidAt: Date;
  recordedBy: string;
  createdAt: Date;
  refunds: {
    id: string;
    paymentId: string;
    amountCents: number;
    reason: string;
    refundedBy: string;
    refundedAt: Date;
  }[];
};
