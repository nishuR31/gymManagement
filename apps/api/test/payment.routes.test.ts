import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuthUserDto, InvoiceDto, PaymentAnalyticsDto, RoleName } from "@gym/shared";
import { buildApp } from "../src/app.js";
import type { Env } from "../src/config/env.js";
import { PaymentService } from "../src/services/payment.service.js";
import { hashPassword } from "../src/utils/password.js";
import { InMemoryAuthRepository } from "./in-memory-auth-repository.js";
import { InMemoryMemberRepository } from "./in-memory-member-repository.js";
import { InMemoryMembershipRepository } from "./in-memory-membership-repository.js";
import { InMemoryPaymentAnalyticsCache } from "./in-memory-payment-cache.js";
import { InMemoryPaymentRepository } from "./in-memory-payment-repository.js";

interface LoginResponse {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
}

interface InvoiceResponse {
  invoice: InvoiceDto;
}

interface ErrorResponse {
  error: {
    code: string;
    details?: {
      remainingCents?: number;
      refundableCents?: number;
    };
  };
}

const testEnv: Env = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://gym:gym@localhost:5432/gym?schema=public",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "test-secret-with-more-than-32-characters",
  JWT_ACCESS_EXPIRES_IN: "15m",
  REFRESH_TOKEN_TTL_DAYS: 30,
  PASSWORD_RESET_TOKEN_TTL_MINUTES: 30,
  CORS_ORIGIN: "http://localhost:5173",
  COOKIE_SECURE: false,
  API_PORT: 4000
};

describe("payment routes", () => {
  let app: FastifyInstance;
  let authRepository: InMemoryAuthRepository;
  let memberRepository: InMemoryMemberRepository;
  let membershipRepository: InMemoryMembershipRepository;
  let paymentRepository: InMemoryPaymentRepository;
  let paymentCache: InMemoryPaymentAnalyticsCache;
  let adminToken: string;
  let staffToken: string;
  let adminUser: AuthUserDto;
  let staffUser: AuthUserDto;
  let now: Date;

  beforeEach(async () => {
    now = new Date("2026-08-11T10:00:00.000Z");
    authRepository = new InMemoryAuthRepository();
    memberRepository = new InMemoryMemberRepository();
    membershipRepository = new InMemoryMembershipRepository();
    paymentRepository = new InMemoryPaymentRepository();
    paymentCache = new InMemoryPaymentAnalyticsCache();
    app = await buildApp({
      env: testEnv,
      authRepository,
      memberRepository,
      membershipRepository,
      paymentRepository,
      paymentAnalyticsCache: paymentCache,
      enableRateLimit: false,
      enableJobs: false,
      clock: () => now
    });
    adminUser = await seedUser("admin@example.com", "AdminPass123", "ADMIN");
    staffUser = await seedUser("staff@example.com", "StaffPass123", "STAFF");
    adminToken = await login("admin@example.com", "AdminPass123");
    staffToken = await login("staff@example.com", "StaffPass123");
  });

  afterEach(async () => {
    await app.close();
  });

  it("marks an invoice paid after a full payment", async () => {
    const invoice = await createInvoice(5000);
    const response = await pay(invoice.id, 5000);

    expect(response.statusCode).toBe(201);
    const paid = response.json<InvoiceResponse>().invoice;
    expect(paid.status).toBe("PAID");
    expect(paid.amountPaidCents).toBe(5000);
    expect(paid.remainingCents).toBe(0);
  });

  it("moves pending to partial to paid using the derived payment sum", async () => {
    const invoice = await createInvoice(10000);
    const first = (await pay(invoice.id, 4000)).json<InvoiceResponse>().invoice;
    expect(first.status).toBe("PARTIALLY_PAID");
    expect(first.amountPaidCents).toBe(4000);

    const second = (await pay(invoice.id, 6000)).json<InvoiceResponse>().invoice;
    expect(second.status).toBe("PAID");
    expect(second.amountPaidCents).toBe(10000);
    expect(paymentRepository.invoices.get(invoice.id)?.status).toBe("PAID");
  });

  it("refunds a payment and rejects refunds above the remaining refundable amount", async () => {
    const invoice = await createInvoice(8000);
    const paid = (await pay(invoice.id, 8000)).json<InvoiceResponse>().invoice;
    const paymentId = paid.payments[0]?.id;
    expect(paymentId).toBeTruthy();

    const refund = await app.inject({
      method: "POST",
      url: `/payments/${paymentId}/refund`,
      headers: authHeader(adminToken),
      payload: { amountCents: 3000, reason: "Plan downgrade" }
    });
    expect(refund.statusCode).toBe(201);
    const refundedInvoice = refund.json<InvoiceResponse>().invoice;
    expect(refundedInvoice.amountPaidCents).toBe(5000);
    expect(refundedInvoice.status).toBe("PARTIALLY_PAID");

    const excessive = await app.inject({
      method: "POST",
      url: `/payments/${paymentId}/refund`,
      headers: authHeader(adminToken),
      payload: { amountCents: 6000, reason: "Too much" }
    });
    expect(excessive.statusCode).toBe(409);
    expect(excessive.json<ErrorResponse>().error.code).toBe("REFUND_AMOUNT_EXCEEDED");
  });

  it("rejects concurrent payments that would exceed the remaining balance", async () => {
    const member = await createMember();
    const service = new PaymentService(
      paymentRepository,
      memberRepository,
      membershipRepository,
      authRepository,
      () => now,
      paymentCache
    );
    const invoice = await service.createInvoice(
      member.id,
      { amountDueCents: 5000, dueDate: now },
      staffUser,
      {}
    );

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => service.recordPayment(invoice.id, { amountCents: 1000, method: "CASH" }, staffUser, {}))
    );
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    const finalInvoice = await paymentRepository.findInvoiceById(invoice.id);

    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(5);
    expect(finalInvoice?.amountPaidCents).toBe(5000);
    expect(finalInvoice?.remainingCents).toBe(0);
    expect(rejected.every((result) => result.status === "rejected" && result.reason.code === "REMAINING_BALANCE_EXCEEDED")).toBe(true);
  });

  it("keeps exact integer-cent math across mixed payments and refunds", async () => {
    const invoice = await createInvoice(10000);
    const first = (await pay(invoice.id, 3333)).json<InvoiceResponse>().invoice;
    await pay(invoice.id, 2222);
    const paymentId = first.payments[0]?.id;
    expect(paymentId).toBeTruthy();

    await app.inject({
      method: "POST",
      url: `/payments/${paymentId}/refund`,
      headers: authHeader(adminToken),
      payload: { amountCents: 1111, reason: "Partial refund" }
    });
    const finalInvoice = await paymentRepository.findInvoiceById(invoice.id);

    expect(finalInvoice?.amountPaidCents).toBe(4444);
    expect(finalInvoice?.amountPaidCents).toBe(
      [...paymentRepository.payments.values()].reduce((total, payment) => total + payment.amountCents, 0) -
        [...paymentRepository.refunds.values()].reduce((total, refund) => total + refund.amountCents, 0)
    );
  });

  it("invalidates payment analytics cache after recording a payment", async () => {
    const invoice = await createInvoice(5000);
    const first = await app.inject({
      method: "GET",
      url: "/payments/analytics?range=daily",
      headers: authHeader(adminToken)
    });
    expect(first.statusCode).toBe(200);
    expect(first.json<PaymentAnalyticsDto>().totalRevenueCents).toBe(0);

    await pay(invoice.id, 5000);
    const second = await app.inject({
      method: "GET",
      url: "/payments/analytics?range=daily",
      headers: authHeader(adminToken)
    });
    expect(second.statusCode).toBe(200);
    expect(second.json<PaymentAnalyticsDto>().totalRevenueCents).toBe(5000);
  });

  async function createInvoice(amountDueCents: number): Promise<InvoiceDto> {
    const member = await createMember();
    const response = await app.inject({
      method: "POST",
      url: `/members/${member.id}/invoices`,
      headers: authHeader(staffToken),
      payload: {
        amountDueCents,
        dueDate: now.toISOString()
      }
    });
    expect(response.statusCode).toBe(201);
    return response.json<InvoiceResponse>().invoice;
  }

  async function createMember() {
    return memberRepository.create({
      firstName: "Ava",
      lastName: "Rao",
      phone: `99999${Math.random().toString().slice(2, 7)}`,
      qrSecret: `qr-${Math.random()}`
    });
  }

  async function pay(invoiceId: string, amountCents: number) {
    return app.inject({
      method: "POST",
      url: `/invoices/${invoiceId}/payments`,
      headers: authHeader(staffToken),
      payload: { amountCents, method: "CASH" }
    });
  }

  async function seedUser(email: string, password: string, role: RoleName): Promise<AuthUserDto> {
    return authRepository.createUser({
      email,
      passwordHash: await hashPassword(password),
      firstName: role,
      lastName: "User",
      roleName: role
    });
  }

  async function login(email: string, password: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password }
    });
    expect(response.statusCode).toBe(200);
    return response.json<LoginResponse>().accessToken;
  }
});

function authHeader(token: string) {
  return {
    authorization: `Bearer ${token}`
  };
}
