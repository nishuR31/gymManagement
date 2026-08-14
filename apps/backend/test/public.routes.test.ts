import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuthUserDto, InquiryDto, PaginatedInquiryDto, PublicMembershipPlanDto, RoleName } from "@gym/shared";
import { buildApp } from "../src/app.js";
import type { Env } from "../src/config/env.js";
import { hashPassword } from "../src/utils/password.js";
import { InMemoryAuthRepository } from "./in-memory-auth-repository.js";
import { InMemoryInquiryRepository } from "./in-memory-inquiry-repository.js";
import { InMemoryMembershipRepository } from "./in-memory-membership-repository.js";

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

describe("phase A public site routes", () => {
  let app: FastifyInstance;
  let authRepository: InMemoryAuthRepository;
  let membershipRepository: InMemoryMembershipRepository;
  let inquiryRepository: InMemoryInquiryRepository;
  let adminToken: string;
  let staffToken: string;

  beforeEach(async () => {
    authRepository = new InMemoryAuthRepository();
    membershipRepository = new InMemoryMembershipRepository();
    inquiryRepository = new InMemoryInquiryRepository();
    app = await buildApp({
      env: testEnv,
      authRepository,
      membershipRepository,
      inquiryRepository,
      enableJobs: false
    });

    await seedUser("admin@example.com", "AdminPass123", "ADMIN");
    await seedUser("staff@example.com", "StaffPass123", "STAFF");
    adminToken = await login("admin@example.com", "AdminPass123");
    staffToken = await login("staff@example.com", "StaffPass123");
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns only customer-facing fields from public active plans", async () => {
    await membershipRepository.createPlan({
      name: "Monthly",
      durationDays: 30,
      priceCents: 5000,
      ptIncluded: true,
      lockerIncluded: true,
      guestPassesIncluded: 2,
      accessTiming: "6 AM - 10 PM",
      gracePeriodDays: 5,
      freezeAllowed: true
    });
    const inactive = await membershipRepository.createPlan({
      name: "Archived",
      durationDays: 365,
      priceCents: 50000,
      ptIncluded: false,
      lockerIncluded: false,
      guestPassesIncluded: 0,
      gracePeriodDays: 0,
      freezeAllowed: false
    });
    await membershipRepository.updatePlan(inactive.id, { isActive: false });

    const response = await app.inject({
      method: "GET",
      url: "/public/plans"
    });

    expect(response.statusCode).toBe(200);
    const plans = response.json<{ data: PublicMembershipPlanDto[] }>().data;
    expect(plans).toHaveLength(1);
    expect(Object.keys(plans[0] ?? {}).sort()).toEqual(["description", "durationDays", "name", "priceCents"]);
    expect(plans[0]).toEqual({
      name: "Monthly",
      description: null,
      durationDays: 30,
      priceCents: 5000
    });
  });

  it("stores public inquiries and exposes them only to admin roles", async () => {
    const createResponse = await createInquiry("lead@example.com");
    expect(createResponse.statusCode).toBe(201);
    const inquiry = createResponse.json<{ inquiry: InquiryDto }>().inquiry;
    expect(inquiry.status).toBe("NEW");
    expect(inquiry.phone).toBe("9999999999");

    const staffList = await app.inject({
      method: "GET",
      url: "/inquiries",
      headers: authHeader(staffToken)
    });
    expect(staffList.statusCode).toBe(403);

    const adminList = await app.inject({
      method: "GET",
      url: "/inquiries",
      headers: authHeader(adminToken)
    });
    expect(adminList.statusCode).toBe(200);
    expect(adminList.json<PaginatedInquiryDto>().data).toHaveLength(1);

    const readResponse = await app.inject({
      method: "POST",
      url: `/inquiries/${inquiry.id}/read`,
      headers: authHeader(adminToken)
    });
    expect(readResponse.statusCode).toBe(200);
    expect(readResponse.json<{ inquiry: InquiryDto }>().inquiry.status).toBe("READ");

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/inquiries/${inquiry.id}`,
      headers: authHeader(adminToken)
    });
    expect(deleteResponse.statusCode).toBe(200);
  });

  it("rate-limits a second inquiry for the same email and IP inside the window", async () => {
    const firstResponse = await createInquiry("same@example.com");
    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await createInquiry("same@example.com");
    expect(secondResponse.statusCode).toBe(429);

    const differentEmailResponse = await createInquiry("other@example.com");
    expect(differentEmailResponse.statusCode).toBe(201);
  });

  async function createInquiry(email: string) {
    return app.inject({
      method: "POST",
      url: "/public/inquiries",
      payload: {
        name: "Prospect Person",
        email,
        phone: "9999999999",
        message: "I would like to know more about joining ValorFitness."
      }
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

  function authHeader(token: string): { authorization: string } {
    return { authorization: `Bearer ${token}` };
  }
});
