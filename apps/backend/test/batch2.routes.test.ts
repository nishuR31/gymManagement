import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuthUserDto, DashboardSummaryDto, NotificationDto, ReportDto, RoleName, SettingDto } from "@gym/shared";
import { buildApp } from "../src/app.js";
import type { Env } from "../src/config/env.js";
import { hashPassword } from "../src/utils/password.js";
import { InMemoryAttendanceRepository } from "./in-memory-attendance-repository.js";
import { InMemoryAuthRepository } from "./in-memory-auth-repository.js";
import { InMemoryInventoryAggregateCache } from "./in-memory-inventory-cache.js";
import { InMemoryInventoryRepository } from "./in-memory-inventory-repository.js";
import { InMemoryMemberRepository } from "./in-memory-member-repository.js";
import { InMemoryMembershipRepository } from "./in-memory-membership-repository.js";
import { InMemoryPaymentAnalyticsCache } from "./in-memory-payment-cache.js";
import { InMemoryPaymentRepository } from "./in-memory-payment-repository.js";
import {
  InMemoryActivityLogRepository,
  InMemoryNotificationRepository,
  InMemoryReportRepository,
  InMemorySettingsRepository
} from "./in-memory-batch2-repositories.js";

interface LoginResponse {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
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

describe("batch 2 backend routes", () => {
  let app: FastifyInstance;
  let authRepository: InMemoryAuthRepository;
  let memberRepository: InMemoryMemberRepository;
  let attendanceRepository: InMemoryAttendanceRepository;
  let membershipRepository: InMemoryMembershipRepository;
  let paymentRepository: InMemoryPaymentRepository;
  let inventoryRepository: InMemoryInventoryRepository;
  let activityLogRepository: InMemoryActivityLogRepository;
  let notificationRepository: InMemoryNotificationRepository;
  let settingsRepository: InMemorySettingsRepository;
  let reportRepository: InMemoryReportRepository;
  let adminToken: string;
  let staffToken: string;
  let memberUser: AuthUserDto;
  let now: Date;

  beforeEach(async () => {
    now = new Date("2026-08-11T10:00:00.000Z");
    authRepository = new InMemoryAuthRepository();
    memberRepository = new InMemoryMemberRepository();
    attendanceRepository = new InMemoryAttendanceRepository(memberRepository);
    membershipRepository = new InMemoryMembershipRepository();
    paymentRepository = new InMemoryPaymentRepository();
    inventoryRepository = new InMemoryInventoryRepository();
    activityLogRepository = new InMemoryActivityLogRepository();
    notificationRepository = new InMemoryNotificationRepository();
    settingsRepository = new InMemorySettingsRepository();
    reportRepository = new InMemoryReportRepository();

    app = await buildApp({
      env: testEnv,
      authRepository,
      memberRepository,
      attendanceRepository,
      membershipRepository,
      paymentRepository,
      inventoryRepository,
      activityLogRepository,
      notificationRepository,
      settingsRepository,
      reportRepository,
      paymentAnalyticsCache: new InMemoryPaymentAnalyticsCache(),
      inventoryCache: new InMemoryInventoryAggregateCache(),
      aggregateCache: new InMemoryPaymentAnalyticsCache(),
      enableRateLimit: false,
      enableJobs: false,
      clock: () => now
    });

    await seedUser("admin@example.com", "AdminPass123", "ADMIN");
    await seedUser("staff@example.com", "StaffPass123", "STAFF");
    memberUser = await seedUser("member@example.com", "MemberPass123", "MEMBER");
    adminToken = await login("admin@example.com", "AdminPass123");
    staffToken = await login("staff@example.com", "StaffPass123");
  });

  afterEach(async () => {
    await app.close();
  });

  it("supports settings, notifications, and activity-log browsing with RBAC", async () => {
    const blockedSettings = await app.inject({
      method: "PUT",
      url: "/settings/gym-details",
      headers: authHeader(staffToken),
      payload: { value: { name: "Iron House" } }
    });
    expect(blockedSettings.statusCode).toBe(403);

    const savedSetting = await app.inject({
      method: "PUT",
      url: "/settings/gym-details",
      headers: authHeader(adminToken),
      payload: { value: { name: "Iron House" } }
    });
    expect(savedSetting.statusCode).toBe(200);
    expect(savedSetting.json<{ setting: SettingDto }>().setting.value).toEqual({ name: "Iron House" });

    const createdNotification = await app.inject({
      method: "POST",
      url: "/notifications",
      headers: authHeader(adminToken),
      payload: {
        userId: memberUser.id,
        title: "Payment due",
        body: "Your membership invoice is pending.",
        category: "PAYMENT",
        priority: "HIGH"
      }
    });
    expect(createdNotification.statusCode).toBe(201);
    const notification = createdNotification.json<{ notification: NotificationDto }>().notification;

    const unread = await app.inject({ method: "GET", url: "/notifications/unread-count", headers: authHeader(staffToken) });
    expect(unread.statusCode).toBe(200);
    expect(unread.json<{ count: number }>().count).toBe(1);

    const read = await app.inject({ method: "POST", url: `/notifications/${notification.id}/read`, headers: authHeader(adminToken) });
    expect(read.statusCode).toBe(200);
    expect(read.json<{ notification: NotificationDto }>().notification.readAt).toBeTruthy();

    activityLogRepository.logs.push({
      id: "log-1",
      userId: memberUser.id,
      action: "SETTING_UPDATED",
      entity: "Setting",
      entityId: "gym-details",
      metadata: { key: "gym-details" },
      ipAddress: null,
      userAgent: null,
      createdAt: now
    });
    const logs = await app.inject({ method: "GET", url: "/activity-logs?entity=Setting", headers: authHeader(adminToken) });
    expect(logs.statusCode).toBe(200);
    expect(logs.json<{ data: unknown[] }>().data).toHaveLength(1);
  });

  it("returns reports as JSON and CSV", async () => {
    reportRepository.membershipRows = [{ label: "ACTIVE", count: 3 }];
    reportRepository.invoiceRows = [{ label: "PENDING", amountCents: 12500 }];
    reportRepository.growthRows = [{ month: "2026-08", joined: 2 }];

    const memberships = await app.inject({ method: "GET", url: "/reports/memberships", headers: authHeader(adminToken) });
    expect(memberships.statusCode).toBe(200);
    expect(memberships.json<ReportDto>().totals.subscriptions).toBe(3);

    const csv = await app.inject({ method: "GET", url: "/reports/payments?format=csv", headers: authHeader(adminToken) });
    expect(csv.statusCode).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.body).toContain("status,amountCents");
    expect(csv.body).toContain("PENDING,12500");
  });

  it("invalidates dashboard and report caches after writes", async () => {
    reportRepository.invoiceRows = [{ label: "PENDING", amountCents: 1000 }];
    const firstReport = await app.inject({ method: "GET", url: "/reports/payments", headers: authHeader(adminToken) });
    expect(firstReport.statusCode).toBe(200);
    expect(firstReport.json<ReportDto>().totals.amountDueCents).toBe(1000);

    reportRepository.invoiceRows = [{ label: "PAID", amountCents: 2000 }];
    await app.inject({
      method: "PUT",
      url: "/settings/tax-rate",
      headers: authHeader(adminToken),
      payload: { value: { gstPercent: 18 } }
    });
    const secondReport = await app.inject({ method: "GET", url: "/reports/payments", headers: authHeader(adminToken) });
    expect(secondReport.json<ReportDto>().totals.amountDueCents).toBe(2000);

    const member = await memberRepository.create({
      firstName: "Nina",
      lastName: "Patel",
      phone: "9888888888",
      qrSecret: "nina-qr"
    });
    const plan = await membershipRepository.createPlan({
      name: "Monthly",
      durationDays: 30,
      priceCents: 10000,
      ptIncluded: false,
      lockerIncluded: false,
      guestPassesIncluded: 0,
      gracePeriodDays: 0,
      freezeAllowed: false
    });
    await membershipRepository.createSubscription({
      memberId: member.id,
      planId: plan.id,
      startDate: now,
      endDate: new Date("2026-09-01T00:00:00.000Z"),
      priceAtPurchaseCents: 10000
    });
    const firstDashboard = await app.inject({ method: "GET", url: "/dashboard/summary", headers: authHeader(staffToken) });
    expect(firstDashboard.json<DashboardSummaryDto>().membersCurrentlyInGym).toBe(0);

    await app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: authHeader(staffToken),
      payload: { memberId: member.id }
    });
    const secondDashboard = await app.inject({ method: "GET", url: "/dashboard/summary", headers: authHeader(staffToken) });
    expect(secondDashboard.json<DashboardSummaryDto>().membersCurrentlyInGym).toBe(1);
  });

  it("aggregates the must-have dashboard metrics from existing modules", async () => {
    const member = await memberRepository.create({
      userId: memberUser.id,
      firstName: "Ava",
      lastName: "Rao",
      phone: "9999999999",
      qrSecret: "member-qr"
    });
    await attendanceRepository.createOpenAttendance({
      memberId: member.id,
      checkInAt: now,
      checkInMethod: "MEMBER_ID",
      checkedInBy: memberUser.id
    });
    const invoice = await paymentRepository.createInvoice({ memberId: member.id, amountDueCents: 10000, dueDate: now });
    await paymentRepository.recordPayment({ invoiceId: invoice.id, amountCents: 4000, method: "CASH", recordedBy: memberUser.id, paidAt: now });
    const plan = await membershipRepository.createPlan({
      name: "Monthly",
      durationDays: 30,
      priceCents: 10000,
      ptIncluded: false,
      lockerIncluded: false,
      guestPassesIncluded: 0,
      gracePeriodDays: 0,
      freezeAllowed: false
    });
    await membershipRepository.createSubscription({
      memberId: member.id,
      planId: plan.id,
      startDate: now,
      endDate: new Date("2026-08-20T00:00:00.000Z"),
      priceAtPurchaseCents: 10000
    });
    await inventoryRepository.createProduct({
      name: "Whey",
      category: "PROTEIN",
      sku: "WHEY-1",
      priceCents: 250000,
      costCents: 180000,
      reorderThreshold: 5
    });
    activityLogRepository.logs.push({
      id: "log-1",
      userId: memberUser.id,
      action: "PAYMENT_RECORDED",
      entity: "Invoice",
      entityId: invoice.id,
      metadata: {},
      ipAddress: null,
      userAgent: null,
      createdAt: now
    });

    const response = await app.inject({ method: "GET", url: "/dashboard/summary", headers: authHeader(staffToken) });
    expect(response.statusCode).toBe(200);
    const dashboard = response.json<DashboardSummaryDto>();
    expect(dashboard.membersCurrentlyInGym).toBe(1);
    expect(dashboard.todaysAttendance).toBe(1);
    expect(dashboard.todaysRevenueCents).toBe(4000);
    expect(dashboard.pendingDuesCents).toBe(6000);
    expect(dashboard.membershipsExpiringSoon).toHaveLength(1);
    expect(dashboard.recentPayments).toHaveLength(1);
    expect(dashboard.lowStockAlerts).toHaveLength(1);
    expect(dashboard.recentActivity).toHaveLength(1);
  });

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
