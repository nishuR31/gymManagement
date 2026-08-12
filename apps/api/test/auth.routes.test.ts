import type { FastifyInstance } from "fastify";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { AuthUserDto } from "@gym/shared";
import { buildApp } from "../src/app.js";
import type { Env } from "../src/config/env.js";
import { hashPassword } from "../src/utils/password.js";
import { InMemoryAuthRepository } from "./in-memory-auth-repository.js";

interface LoginResponse {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
}

interface PasswordResetRequestResponse {
  message: string;
  resetToken?: string;
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

describe("auth routes", () => {
  let app: FastifyInstance;
  let repository: InMemoryAuthRepository;

  beforeEach(async () => {
    repository = new InMemoryAuthRepository();
    app = await buildApp({
      env: testEnv,
      authRepository: repository,
      enableRateLimit: false
    });

    await repository.createUser({
      email: "owner@example.com",
      passwordHash: await hashPassword("OwnerPass123"),
      firstName: "Gym",
      lastName: "Owner",
      roleName: "GYM_OWNER"
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("logs in an active owner and exposes the current user through a protected route", async () => {
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "owner@example.com",
        password: "OwnerPass123"
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.headers["set-cookie"]).toBeDefined();

    const body = loginResponse.json<LoginResponse>();
    expect(body.user.role).toBe("GYM_OWNER");
    expect(body.accessToken).toEqual(expect.any(String));

    const meResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        authorization: `Bearer ${body.accessToken}`
      }
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json<{ user: AuthUserDto }>().user.email).toBe("owner@example.com");
  });

  it("kills the session when a rotated refresh token is reused", async () => {
    const loginResponse = await loginAsOwner();
    const firstCookie = extractRefreshCookie(loginResponse.headers["set-cookie"]);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      cookies: {
        refreshToken: firstCookie
      }
    });

    expect(refreshResponse.statusCode).toBe(200);
    const secondCookie = extractRefreshCookie(refreshResponse.headers["set-cookie"]);
    expect(secondCookie).not.toBe(firstCookie);

    const reuseResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      cookies: {
        refreshToken: firstCookie
      }
    });

    expect(reuseResponse.statusCode).toBe(401);

    const latestTokenAfterReuseResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      cookies: {
        refreshToken: secondCookie
      }
    });

    expect(latestTokenAfterReuseResponse.statusCode).toBe(401);
    expect([...repository.sessions.values()].every((session) => session.revokedAt)).toBe(true);
    expect([...repository.refreshTokens.values()].every((token) => token.revokedAt)).toBe(true);
    expect(repository.auditLogs.some((log) => log.action === "AUTH_REFRESH_REUSE_DETECTED")).toBe(true);
  });

  it("allows an owner to register staff but blocks public registration", async () => {
    const loginResponse = await loginAsOwner();
    const body = loginResponse.json<LoginResponse>();

    const unauthenticatedResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "staff@example.com",
        password: "StaffPass123",
        firstName: "Staff",
        lastName: "Member",
        role: "STAFF"
      }
    });

    expect(unauthenticatedResponse.statusCode).toBe(401);

    const registeredResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      headers: {
        authorization: `Bearer ${body.accessToken}`
      },
      payload: {
        email: "staff@example.com",
        password: "StaffPass123",
        firstName: "Staff",
        lastName: "Member",
        role: "STAFF"
      }
    });

    expect(registeredResponse.statusCode).toBe(201);
    expect(registeredResponse.json<{ user: AuthUserDto }>().user.role).toBe("STAFF");
  });

  it("confirms password reset with a short-lived stateless reset token", async () => {
    const resetRequest = await app.inject({
      method: "POST",
      url: "/auth/password-reset/request",
      payload: {
        email: "owner@example.com"
      }
    });

    expect(resetRequest.statusCode).toBe(200);
    const resetBody = resetRequest.json<PasswordResetRequestResponse>();
    expect(resetBody.resetToken).toEqual(expect.any(String));

    const confirmResponse = await app.inject({
      method: "POST",
      url: "/auth/password-reset/confirm",
      payload: {
        token: resetBody.resetToken,
        newPassword: "NewOwnerPass123"
      }
    });

    expect(confirmResponse.statusCode).toBe(204);

    const oldLoginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "owner@example.com",
        password: "OwnerPass123"
      }
    });
    expect(oldLoginResponse.statusCode).toBe(401);

    const newLoginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "owner@example.com",
        password: "NewOwnerPass123"
      }
    });
    expect(newLoginResponse.statusCode).toBe(200);
  });

  async function loginAsOwner() {
    return app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "owner@example.com",
        password: "OwnerPass123"
      }
    });
  }
});

function extractRefreshCookie(setCookieHeader: number | string | string[] | undefined): string {
  const cookieHeader = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;

  if (typeof cookieHeader !== "string") {
    throw new Error("Expected refresh cookie header");
  }

  const [nameValue] = cookieHeader.split(";");
  const [, value] = nameValue.split("=");

  if (!value) {
    throw new Error("Expected refresh cookie value");
  }

  return value;
}
