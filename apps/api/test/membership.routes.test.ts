import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuthUserDto, MembershipPlanDto, MembershipSubscriptionDto, RoleName } from "@gym/shared";
import { buildApp } from "../src/app.js";
import type { Env } from "../src/config/env.js";
import { MembershipService } from "../src/services/membership.service.js";
import { hashPassword } from "../src/utils/password.js";
import { InMemoryAttendanceRepository } from "./in-memory-attendance-repository.js";
import { InMemoryAuthRepository } from "./in-memory-auth-repository.js";
import { InMemoryMemberRepository } from "./in-memory-member-repository.js";
import { InMemoryMembershipRepository } from "./in-memory-membership-repository.js";

interface LoginResponse {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
}

interface PlanResponse {
  plan: MembershipPlanDto;
}

interface PlanListResponse {
  data: MembershipPlanDto[];
}

interface SubscriptionResponse {
  subscription: MembershipSubscriptionDto;
}

interface SubscriptionListResponse {
  data: MembershipSubscriptionDto[];
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

describe("membership plan and subscription routes", () => {
  let app: FastifyInstance;
  let authRepository: InMemoryAuthRepository;
  let memberRepository: InMemoryMemberRepository;
  let membershipRepository: InMemoryMembershipRepository;
  let adminToken: string;
  let staffToken: string;
  let memberToken: string;
  let memberUserId: string;
  let now: Date;

  beforeEach(async () => {
    now = new Date("2026-08-01T00:00:00.000Z");
    authRepository = new InMemoryAuthRepository();
    memberRepository = new InMemoryMemberRepository();
    membershipRepository = new InMemoryMembershipRepository();
    app = await buildApp({
      env: testEnv,
      authRepository,
      memberRepository,
      membershipRepository,
      attendanceRepository: new InMemoryAttendanceRepository(memberRepository),
      enableRateLimit: false,
      enableJobs: false,
      clock: () => now
    });

    await seedUser("admin@example.com", "AdminPass123", "ADMIN");
    await seedUser("staff@example.com", "StaffPass123", "STAFF");
    const memberUser = await seedUser("member@example.com", "MemberPass123", "MEMBER");
    memberUserId = memberUser.id;
    adminToken = await login("admin@example.com", "AdminPass123");
    staffToken = await login("staff@example.com", "StaffPass123");
    memberToken = await login("member@example.com", "MemberPass123");
  });

  afterEach(async () => {
    await app.close();
  });

  it("supports plan CRUD and deactivation for admin roles only", async () => {
    const createResponse = await createPlan(adminToken, {
      name: "Quarterly",
      durationDays: 90,
      priceCents: 15000,
      ptIncluded: true,
      lockerIncluded: false,
      guestPassesIncluded: 2,
      accessTiming: "6 AM - 10 PM",
      gracePeriodDays: 3,
      freezeAllowed: true
    });
    expect(createResponse.statusCode).toBe(201);
    const plan = createResponse.json<PlanResponse>().plan;
    expect(plan.priceCents).toBe(15000);

    const staffCreateResponse = await createPlan(staffToken, {
      name: "Staff Plan",
      durationDays: 30,
      priceCents: 5000
    });
    expect(staffCreateResponse.statusCode).toBe(403);

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/membership-plans/${plan.id}`,
      headers: authHeader(adminToken),
      payload: {
        priceCents: 17500
      }
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json<PlanResponse>().plan.priceCents).toBe(17500);

    const deactivateResponse = await app.inject({
      method: "POST",
      url: `/membership-plans/${plan.id}/deactivate`,
      headers: authHeader(adminToken)
    });
    expect(deactivateResponse.statusCode).toBe(200);
    expect(deactivateResponse.json<PlanResponse>().plan.isActive).toBe(false);

    const listResponse = await app.inject({
      method: "GET",
      url: "/membership-plans?includeInactive=true",
      headers: authHeader(adminToken)
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json<PlanListResponse>().data).toHaveLength(1);
  });

  it("assigns subscriptions with stored end date and immutable price snapshot", async () => {
    const member = await createMember(memberUserId);
    const plan = await createPlanAndReturn(12000);

    const assignResponse = await assignSubscription(adminToken, member.id, plan.id, "2026-08-01");
    expect(assignResponse.statusCode).toBe(201);
    const subscription = assignResponse.json<SubscriptionResponse>().subscription;
    expect(subscription.endDate).toBe("2026-08-31");
    expect(subscription.priceAtPurchaseCents).toBe(12000);

    await app.inject({
      method: "PATCH",
      url: `/membership-plans/${plan.id}`,
      headers: authHeader(adminToken),
      payload: {
        priceCents: 16000
      }
    });

    const historyResponse = await app.inject({
      method: "GET",
      url: `/members/${member.id}/subscriptions`,
      headers: authHeader(staffToken)
    });
    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.json<SubscriptionListResponse>().data[0]?.priceAtPurchaseCents).toBe(12000);
  });

  it("renews by expiring an already-ended active subscription and creating a new row", async () => {
    const member = await createMember();
    const plan = await createPlanAndReturn(8000);
    const firstAssignResponse = await assignSubscription(adminToken, member.id, plan.id, "2026-08-01");
    expect(firstAssignResponse.statusCode).toBe(201);

    const activeSubscription = firstAssignResponse.json<SubscriptionResponse>().subscription;
    now = new Date("2026-09-05T00:00:00.000Z");
    const renewalResponse = await assignSubscription(adminToken, member.id, plan.id, "2026-09-05");

    expect(renewalResponse.statusCode).toBe(201);
    const subscriptions = [...membershipRepository.subscriptions.values()].filter(
      (subscription) => subscription.memberId === member.id
    );
    expect(subscriptions).toHaveLength(2);
    expect(membershipRepository.subscriptions.get(activeSubscription.id)?.status).toBe("EXPIRED");
    expect(subscriptions.filter((subscription) => subscription.status === "ACTIVE")).toHaveLength(1);
  });

  it("enforces one active subscription per member under direct service concurrency", async () => {
    const member = await createMember();
    const plan = await createPlanAndReturn(9000);
    const service = new MembershipService(membershipRepository, memberRepository, authRepository, () => now);
    const adminActor = {
      id: "admin-actor",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN" as const
    };

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.assignSubscription(member.id, { planId: plan.id, startDate: now }, adminActor, {})
      )
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(9);
    expect(
      [...membershipRepository.subscriptions.values()].filter(
        (subscription) => subscription.memberId === member.id && subscription.status === "ACTIVE"
      )
    ).toHaveLength(1);
  });

  it("freezes and unfreezes with end-date extension and one-freeze cap", async () => {
    const member = await createMember();
    const plan = await createPlanAndReturn(10000, true);
    const assignResponse = await assignSubscription(adminToken, member.id, plan.id, "2026-08-01");
    const subscription = assignResponse.json<SubscriptionResponse>().subscription;

    now = new Date("2026-08-10T10:00:00.000Z");
    const freezeResponse = await app.inject({
      method: "POST",
      url: `/members/${member.id}/subscriptions/${subscription.id}/freeze`,
      headers: authHeader(adminToken)
    });
    expect(freezeResponse.statusCode).toBe(200);
    expect(freezeResponse.json<SubscriptionResponse>().subscription.status).toBe("FROZEN");

    now = new Date("2026-08-13T10:00:00.000Z");
    const unfreezeResponse = await app.inject({
      method: "POST",
      url: `/members/${member.id}/subscriptions/${subscription.id}/unfreeze`,
      headers: authHeader(adminToken)
    });
    expect(unfreezeResponse.statusCode).toBe(200);
    const unfrozen = unfreezeResponse.json<SubscriptionResponse>().subscription;
    expect(unfrozen.status).toBe("ACTIVE");
    expect(unfrozen.endDate).toBe("2026-09-03");

    const secondFreezeResponse = await app.inject({
      method: "POST",
      url: `/members/${member.id}/subscriptions/${subscription.id}/freeze`,
      headers: authHeader(adminToken)
    });
    expect(secondFreezeResponse.statusCode).toBe(409);
  });

  it("blocks freezing when the plan does not support it and lets members read only their own history", async () => {
    const member = await createMember(memberUserId);
    const otherMember = await createMember();
    const plan = await createPlanAndReturn(7000, false);
    const assignResponse = await assignSubscription(adminToken, member.id, plan.id, "2026-08-01");
    const subscription = assignResponse.json<SubscriptionResponse>().subscription;

    const freezeResponse = await app.inject({
      method: "POST",
      url: `/members/${member.id}/subscriptions/${subscription.id}/freeze`,
      headers: authHeader(adminToken)
    });
    expect(freezeResponse.statusCode).toBe(409);

    const selfHistoryResponse = await app.inject({
      method: "GET",
      url: `/members/${member.id}/subscriptions`,
      headers: authHeader(memberToken)
    });
    expect(selfHistoryResponse.statusCode).toBe(200);

    const otherHistoryResponse = await app.inject({
      method: "GET",
      url: `/members/${otherMember.id}/subscriptions`,
      headers: authHeader(memberToken)
    });
    expect(otherHistoryResponse.statusCode).toBe(403);
  });

  it("allows attendance during membership grace and blocks it after grace-aware expiry", async () => {
    const member = await createMember();
    const plan = await createPlanAndReturn(11000, false, 3);
    await assignSubscription(adminToken, member.id, plan.id, "2026-08-01");

    now = new Date("2026-09-02T09:00:00.000Z");
    const graceCheckIn = await app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: authHeader(staffToken),
      payload: { memberId: member.id }
    });
    expect(graceCheckIn.statusCode).toBe(201);

    await app.inject({
      method: "POST",
      url: "/attendance/check-out",
      headers: authHeader(staffToken),
      payload: { memberId: member.id }
    });

    now = new Date("2026-09-04T09:00:00.000Z");
    const service = new MembershipService(membershipRepository, memberRepository, authRepository, () => now);
    await service.expireSubscriptionsPastGrace();
    const expiredCheckIn = await app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: authHeader(staffToken),
      payload: { memberId: member.id }
    });

    expect(expiredCheckIn.statusCode).toBe(409);
    expect(expiredCheckIn.json<{ error: { code: string } }>().error.code).toBe("NO_ACTIVE_MEMBERSHIP");
  });

  async function seedUser(email: string, password: string, roleName: RoleName) {
    const user = await authRepository.createUser({
      email,
      passwordHash: await hashPassword(password),
      firstName: roleName,
      lastName: "User",
      roleName
    });
    memberRepository.userRoles.set(user.id, roleName);
    return user;
  }

  async function login(email: string, password: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email,
        password
      }
    });
    expect(response.statusCode).toBe(200);
    return response.json<LoginResponse>().accessToken;
  }

  function createPlan(token: string, payload: Record<string, unknown>) {
    return app.inject({
      method: "POST",
      url: "/membership-plans",
      headers: authHeader(token),
      payload
    });
  }

  async function createPlanAndReturn(priceCents: number, freezeAllowed = false, gracePeriodDays = 0): Promise<MembershipPlanDto> {
    const response = await createPlan(adminToken, {
      name: `Plan ${priceCents}`,
      durationDays: 30,
      priceCents,
      freezeAllowed,
      gracePeriodDays
    });
    expect(response.statusCode).toBe(201);
    return response.json<PlanResponse>().plan;
  }

  async function createMember(userId?: string) {
    return memberRepository.create({
      ...(userId ? { userId } : {}),
      firstName: "Test",
      lastName: "Member",
      phone: "+15550004000",
      qrSecret: `qr-${Math.random().toString(36).slice(2)}`
    });
  }

  function assignSubscription(token: string, memberId: string, planId: string, startDate: string) {
    return app.inject({
      method: "POST",
      url: `/members/${memberId}/subscriptions`,
      headers: authHeader(token),
      payload: {
        planId,
        startDate
      }
    });
  }
});

function authHeader(token: string): { authorization: string } {
  return {
    authorization: `Bearer ${token}`
  };
}
