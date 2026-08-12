import { buildApp } from "../apps/api/src/app.js";
import type { FastifyInstance } from "fastify";

interface LoginResponse {
  accessToken: string;
}

interface MemberResponse {
  member: { id: string };
}

interface PlanResponse {
  plan: { id: string };
}

interface InvoiceResponse {
  invoice: { id: string };
}

interface ProductResponse {
  product: { id: string };
}

interface DashboardResponse {
  membersCurrentlyInGym: number;
  todaysAttendance: number;
  todaysRevenueCents: number;
  monthlyRevenueCents: number;
  pendingDuesCents: number;
  lowStockAlerts: unknown[];
  recentPayments: unknown[];
}

const stamp = Date.now();
const ownerEmail = requiredEnv("OWNER_EMAIL");
const ownerPassword = requiredEnv("OWNER_PASSWORD");
let app: FastifyInstance;

async function main(): Promise<void> {
  app = await buildApp({
    enableJobs: false,
    enableRateLimit: false
  });

  try {
    const firstLogin = await inject("POST", "/auth/login", undefined, {
      email: ownerEmail,
      password: ownerPassword
    });
    assertStatus(firstLogin.statusCode, 200, "owner login");
    const originalCookie = requireRefreshCookie(firstLogin);

    const firstRefresh = await inject("POST", "/auth/refresh", originalCookie);
    assertStatus(firstRefresh.statusCode, 200, "refresh rotation");
    const rotatedCookie = requireRefreshCookie(firstRefresh);

    const reuse = await inject("POST", "/auth/refresh", originalCookie);
    assertStatus(reuse.statusCode, 401, "rotated refresh reuse rejection");

    const killedLineage = await inject("POST", "/auth/refresh", rotatedCookie);
    assertStatus(killedLineage.statusCode, 401, "rotated lineage session kill");

    const login = await inject("POST", "/auth/login", undefined, {
      email: ownerEmail,
      password: ownerPassword
    });
    assertStatus(login.statusCode, 200, "owner relogin after session kill");
    const auth = login.json<LoginResponse>();
    const activeCookie = requireRefreshCookie(login);
    const headers = { authorization: `Bearer ${auth.accessToken}` };

    const member = (
      await expectJson<MemberResponse>(
        "POST",
        "/members",
        headers,
        {
          firstName: "Smoke",
          lastName: "Member",
          phone: `90000${String(stamp).slice(-5)}`,
          email: `smoke.member.${stamp}@example.com`,
          heightCm: 175,
          weightKg: 72
        },
        201,
        "member create"
      )
    ).member;

    const plan = (
      await expectJson<PlanResponse>(
        "POST",
        "/membership-plans",
        headers,
        {
          name: `Smoke Monthly ${stamp}`,
          durationDays: 30,
          priceCents: 10000,
          ptIncluded: false,
          lockerIncluded: false,
          guestPassesIncluded: 0,
          gracePeriodDays: 2,
          freezeAllowed: true
        },
        201,
        "membership plan create"
      )
    ).plan;

    await expectJson("POST", `/members/${member.id}/subscriptions`, headers, { planId: plan.id }, 201, "subscription assign");

    await expectJson("POST", "/attendance/check-in", headers, { memberId: member.id }, 201, "attendance check-in");

    const invoice = (
      await expectJson<InvoiceResponse>(
        "POST",
        `/members/${member.id}/invoices`,
        headers,
        { amountDueCents: 5000, dueDate: new Date().toISOString() },
        201,
        "invoice create"
      )
    ).invoice;

    await expectJson("POST", `/invoices/${invoice.id}/payments`, headers, { amountCents: 3000, method: "CASH" }, 201, "partial payment");

    const product = (
      await expectJson<ProductResponse>(
        "POST",
        "/inventory/products",
        headers,
        {
          name: `Smoke Whey ${stamp}`,
          category: "PROTEIN",
          sku: `SMOKE-WHEY-${stamp}`,
          priceCents: 2500,
          costCents: 1800,
          reorderThreshold: 5
        },
        201,
        "product create"
      )
    ).product;

    await expectJson(
      "POST",
      "/inventory/purchase",
      headers,
      { productId: product.id, quantity: 2, unitCostCents: 1800, reference: `smoke-purchase-${stamp}` },
      201,
      "inventory purchase"
    );

    await expectJson(
      "POST",
      "/inventory/sale",
      headers,
      { memberId: member.id, productId: product.id, quantity: 1, method: "CASH", reference: `smoke-sale-${stamp}` },
      201,
      "stock sale"
    );

    const dashboard = await expectJson<DashboardResponse>("GET", "/dashboard/summary", headers, undefined, 200, "dashboard summary");

    assert(dashboard.membersCurrentlyInGym >= 1, "dashboard membersCurrentlyInGym should reflect check-in");
    assert(dashboard.todaysAttendance >= 1, "dashboard todaysAttendance should reflect check-in");
    assert(dashboard.todaysRevenueCents >= 5500, "dashboard todaysRevenueCents should include payment and stock sale");
    assert(dashboard.monthlyRevenueCents >= 5500, "dashboard monthlyRevenueCents should include payment and stock sale");
    assert(dashboard.pendingDuesCents >= 2000, "dashboard pendingDuesCents should include partial invoice balance");
    assert(dashboard.lowStockAlerts.length >= 1, "dashboard lowStockAlerts should include low stock product");
    assert(dashboard.recentPayments.length >= 1, "dashboard recentPayments should include live payment rows");

    const logout = await inject("POST", "/auth/logout", activeCookie);
    assertStatus(logout.statusCode, 204, "logout");

    console.info("LIVE_SMOKE_OK", {
      schema: process.env.SMOKE_SCHEMA ?? "codex_smoke",
      memberId: member.id,
      invoiceId: invoice.id,
      productId: product.id,
      todaysRevenueCents: dashboard.todaysRevenueCents,
      pendingDuesCents: dashboard.pendingDuesCents
    });
  } finally {
    await app.close();
  }
}

async function expectJson<T>(
  method: "GET" | "POST",
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  expectedStatus: number,
  label: string
): Promise<T> {
  const response = await inject(method, url, undefined, payload, headers);
  assertStatus(response.statusCode, expectedStatus, label, response.body);
  return response.json<T>();
}

async function inject(
  method: "GET" | "POST",
  url: string,
  cookie?: string,
  payload?: unknown,
  headers: Record<string, string> = {}
) {
  return app.inject({
    method,
    url,
    headers: {
      ...headers,
      ...(cookie ? { cookie } : {})
    },
    ...(payload === undefined ? {} : { payload })
  });
}

function requireRefreshCookie(response: { headers: Record<string, string | string[] | undefined> }): string {
  const raw = response.headers["set-cookie"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    throw new Error("Expected refreshToken set-cookie header");
  }
  return value.split(";")[0] ?? value;
}

function assertStatus(actual: number, expected: number, label: string, body?: string): void {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, received ${actual}${body ? `: ${body}` : ""}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for live smoke tests`);
  }
  return value;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
