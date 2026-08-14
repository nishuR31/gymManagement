import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuthUserDto, MemberDto, MemberLoginSetupDto } from "@gym/shared";
import { buildApp } from "../src/app.js";
import type { Env } from "../src/config/env.js";
import { MemberService } from "../src/services/member.service.js";
import { hashPassword } from "../src/utils/password.js";
import { InMemoryAuthRepository } from "./in-memory-auth-repository.js";
import { InMemoryMemberRepository } from "./in-memory-member-repository.js";

interface LoginResponse {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
}

interface MemberResponse {
  member: MemberDto;
}

interface MemberListResponse {
  data: MemberDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface QrResponse {
  memberId: string;
  memberCode: string;
  qrPayload: string;
}

interface MemberLoginSetupResponse {
  login: MemberLoginSetupDto;
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

describe("member routes", () => {
  let app: FastifyInstance;
  let authRepository: InMemoryAuthRepository;
  let memberRepository: InMemoryMemberRepository;
  let ownerToken: string;
  let adminToken: string;
  let staffToken: string;
  let memberToken: string;
  let memberUserId: string;

  beforeEach(async () => {
    authRepository = new InMemoryAuthRepository();
    memberRepository = new InMemoryMemberRepository();
    app = await buildApp({
      env: testEnv,
      authRepository,
      memberRepository,
      enableRateLimit: false
    });

    const owner = await seedUser("owner@example.com", "OwnerPass123", "GYM_OWNER");
    const admin = await seedUser("admin@example.com", "AdminPass123", "ADMIN");
    const staff = await seedUser("staff@example.com", "StaffPass123", "STAFF");
    const member = await seedUser("member@example.com", "MemberPass123", "MEMBER");
    memberUserId = member.id;

    ownerToken = await login("owner@example.com", "OwnerPass123");
    adminToken = await login("admin@example.com", "AdminPass123");
    staffToken = await login("staff@example.com", "StaffPass123");
    memberToken = await login("member@example.com", "MemberPass123");
    expect(owner.role).toBe("GYM_OWNER");
    expect(admin.role).toBe("ADMIN");
    expect(staff.role).toBe("STAFF");
  });

  afterEach(async () => {
    await app.close();
  });

  it("creates, lists, reads, and updates a member while protecting medical notes", async () => {
    const createdResponse = await createMember(ownerToken, {
      userId: memberUserId,
      firstName: "Ava",
      lastName: "Shah",
      phone: "+15550001001",
      email: "ava@example.com",
      medicalNotes: "Asthma inhaler in bag",
      heightCm: 170,
      weightKg: 68
    });

    expect(createdResponse.statusCode).toBe(201);
    const created = createdResponse.json<MemberResponse>().member;
    expect(created.memberCode).toBe("GYM-000001");
    expect(created.bmi).toBe(23.5);
    expect(created.medicalNotes).toBe("Asthma inhaler in bag");
    expect(memberRepository.measurements).toHaveLength(1);

    const listResponse = await app.inject({
      method: "GET",
      url: "/members",
      headers: authHeader(staffToken)
    });

    expect(listResponse.statusCode).toBe(200);
    const listBody = listResponse.json<MemberListResponse>();
    expect(listBody.pagination.total).toBe(1);
    expect(listBody.data[0]?.medicalNotes).toBeUndefined();

    const staffDetailResponse = await getMember(staffToken, created.id);
    expect(staffDetailResponse.statusCode).toBe(200);
    expect(staffDetailResponse.json<MemberResponse>().member.medicalNotes).toBeUndefined();

    const selfDetailResponse = await getMember(memberToken, created.id);
    expect(selfDetailResponse.statusCode).toBe(200);
    expect(selfDetailResponse.json<MemberResponse>().member.medicalNotes).toBe("Asthma inhaler in bag");

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/members/${created.id}`,
      headers: authHeader(staffToken),
      payload: {
        phone: "+15550001002",
        weightKg: 70
      }
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json<MemberResponse>().member.weightKg).toBe(70);
    expect(memberRepository.measurements).toHaveLength(2);

    const restrictedUpdateResponse = await app.inject({
      method: "PATCH",
      url: `/members/${created.id}`,
      headers: authHeader(staffToken),
      payload: {
        medicalNotes: "Trying to edit restricted field"
      }
    });

    expect(restrictedUpdateResponse.statusCode).toBe(403);
  });

  it("suspends and restores members, and exposes a check-in eligibility guard for 1b", async () => {
    const created = await createMemberAndReturn(adminToken);

    const suspendResponse = await app.inject({
      method: "POST",
      url: `/members/${created.id}/suspend`,
      headers: authHeader(adminToken),
      payload: {
        reason: "Payment overdue"
      }
    });

    expect(suspendResponse.statusCode).toBe(200);
    expect(suspendResponse.json<MemberResponse>().member.status).toBe("SUSPENDED");

    const memberService = new MemberService(memberRepository, authRepository);
    await expect(memberService.ensureMemberCanCheckIn(created.id)).rejects.toMatchObject({
      statusCode: 409,
      message: "Member is suspended and cannot check in"
    });

    const restoreResponse = await app.inject({
      method: "POST",
      url: `/members/${created.id}/restore`,
      headers: authHeader(adminToken)
    });

    expect(restoreResponse.statusCode).toBe(200);
    expect(restoreResponse.json<MemberResponse>().member.status).toBe("ACTIVE");
    await expect(memberService.ensureMemberCanCheckIn(created.id)).resolves.toBeUndefined();
  });

  it("archives members softly and prevents further mutation", async () => {
    const created = await createMemberAndReturn(adminToken);

    const archiveResponse = await app.inject({
      method: "DELETE",
      url: `/members/${created.id}`,
      headers: authHeader(adminToken)
    });

    expect(archiveResponse.statusCode).toBe(200);
    expect(archiveResponse.json<MemberResponse>().member.status).toBe("ARCHIVED");

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/members/${created.id}`,
      headers: authHeader(adminToken),
      payload: {
        phone: "+15550009999"
      }
    });
    expect(updateResponse.statusCode).toBe(409);

    const restoreResponse = await app.inject({
      method: "POST",
      url: `/members/${created.id}/restore`,
      headers: authHeader(adminToken)
    });
    expect(restoreResponse.statusCode).toBe(409);
  });

  it("regenerates QR payloads without exposing raw member IDs as QR tokens", async () => {
    const created = await createMemberAndReturn(adminToken);

    const qrResponse = await app.inject({
      method: "GET",
      url: `/members/${created.id}/qr`,
      headers: authHeader(staffToken)
    });
    expect(qrResponse.statusCode).toBe(200);
    const originalQr = qrResponse.json<QrResponse>();
    expect(originalQr.qrPayload).toContain("gym-member:v1:");
    expect(originalQr.qrPayload).not.toContain(created.id);

    const regeneratedResponse = await app.inject({
      method: "POST",
      url: `/members/${created.id}/qr/regenerate`,
      headers: authHeader(adminToken)
    });
    expect(regeneratedResponse.statusCode).toBe(200);
    expect(regeneratedResponse.json<QrResponse>().qrPayload).not.toBe(originalQr.qrPayload);
  });

  it("creates and regenerates a one-time member login while the first password is still pending", async () => {
    const createdResponse = await createMember(adminToken, {
      firstName: "Mira",
      lastName: "Rao",
      phone: "+15550003001",
      email: "mira@example.com"
    });
    expect(createdResponse.statusCode).toBe(201);
    const member = createdResponse.json<MemberResponse>().member;

    const setupResponse = await createMemberLogin(member.id);
    expect(setupResponse.statusCode).toBe(201);
    const setup = setupResponse.json<MemberLoginSetupResponse>().login;
    expect(setup.regenerated).toBe(false);
    expect(setup.temporaryPassword).toEqual(expect.any(String));
    expect(setup.user.role).toBe("MEMBER");
    expect(setup.user.mustChangePassword).toBe(true);
    expect(setup.member.userId).toBe(setup.user.id);
    syncMemberLoginUsers();

    const memberLoginResponse = await app.inject({
      method: "POST",
      url: "/auth/member-login",
      payload: {
        email: "mira@example.com",
        password: setup.temporaryPassword
      }
    });
    expect(memberLoginResponse.statusCode).toBe(200);
    expect(memberLoginResponse.json<LoginResponse>().user.mustChangePassword).toBe(true);

    const regenerateResponse = await createMemberLogin(member.id);
    expect(regenerateResponse.statusCode).toBe(201);
    const regenerated = regenerateResponse.json<MemberLoginSetupResponse>().login;
    expect(regenerated.regenerated).toBe(true);
    expect(regenerated.temporaryPassword).not.toBe(setup.temporaryPassword);
    syncMemberLoginUsers();

    const oldTemporaryPasswordResponse = await app.inject({
      method: "POST",
      url: "/auth/member-login",
      payload: {
        email: "mira@example.com",
        password: setup.temporaryPassword
      }
    });
    expect(oldTemporaryPasswordResponse.statusCode).toBe(401);

    const newTemporaryPasswordResponse = await app.inject({
      method: "POST",
      url: "/auth/member-login",
      payload: {
        email: "mira@example.com",
        password: regenerated.temporaryPassword
      }
    });
    expect(newTemporaryPasswordResponse.statusCode).toBe(200);
    expect(newTemporaryPasswordResponse.json<LoginResponse>().user.mustChangePassword).toBe(true);
  });

  it("separates member login errors from invalid credentials only on the member login route", async () => {
    const notMemberResponse = await app.inject({
      method: "POST",
      url: "/auth/member-login",
      payload: {
        email: "staff@example.com",
        password: "StaffPass123"
      }
    });

    expect(notMemberResponse.statusCode).toBe(403);
    expect(notMemberResponse.json<{ error: { code: string; message: string } }>().error).toMatchObject({
      code: "NOT_A_MEMBER",
      message: "You are not a member of ValorFitness"
    });

    const createdResponse = await createMember(adminToken, {
      firstName: "Isha",
      lastName: "Kapoor",
      phone: "+15550003002",
      email: "isha@example.com"
    });
    expect(createdResponse.statusCode).toBe(201);
    const member = createdResponse.json<MemberResponse>().member;
    const setupResponse = await createMemberLogin(member.id);
    expect(setupResponse.statusCode).toBe(201);
    const setup = setupResponse.json<MemberLoginSetupResponse>().login;
    syncMemberLoginUsers();

    const wrongPasswordResponse = await app.inject({
      method: "POST",
      url: "/auth/member-login",
      payload: {
        email: "isha@example.com",
        password: `${setup.temporaryPassword}-wrong`
      }
    });

    expect(wrongPasswordResponse.statusCode).toBe(401);
    expect(wrongPasswordResponse.json<{ error: { code: string; message: string } }>().error).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Invalid email or password"
    });
  });

  it("forces first-password completion before an active member login can be regenerated", async () => {
    const createdResponse = await createMember(adminToken, {
      firstName: "Rohan",
      lastName: "Nair",
      phone: "+15550003003",
      email: "rohan@example.com"
    });
    expect(createdResponse.statusCode).toBe(201);
    const member = createdResponse.json<MemberResponse>().member;
    const setupResponse = await createMemberLogin(member.id);
    expect(setupResponse.statusCode).toBe(201);
    const setup = setupResponse.json<MemberLoginSetupResponse>().login;
    syncMemberLoginUsers();

    const temporaryLoginResponse = await app.inject({
      method: "POST",
      url: "/auth/member-login",
      payload: {
        email: "rohan@example.com",
        password: setup.temporaryPassword
      }
    });
    expect(temporaryLoginResponse.statusCode).toBe(200);
    const temporaryLogin = temporaryLoginResponse.json<LoginResponse>();
    expect(temporaryLogin.user.mustChangePassword).toBe(true);

    const firstPasswordResponse = await app.inject({
      method: "POST",
      url: "/auth/first-password",
      headers: authHeader(temporaryLogin.accessToken),
      payload: {
        newPassword: "RohanMember123"
      }
    });
    expect(firstPasswordResponse.statusCode).toBe(200);
    const completed = firstPasswordResponse.json<LoginResponse>();
    expect(completed.user.mustChangePassword).toBe(false);

    const oldTemporaryPasswordResponse = await app.inject({
      method: "POST",
      url: "/auth/member-login",
      payload: {
        email: "rohan@example.com",
        password: setup.temporaryPassword
      }
    });
    expect(oldTemporaryPasswordResponse.statusCode).toBe(401);

    const activeMemberLoginResponse = await app.inject({
      method: "POST",
      url: "/auth/member-login",
      payload: {
        email: "rohan@example.com",
        password: "RohanMember123"
      }
    });
    expect(activeMemberLoginResponse.statusCode).toBe(200);
    expect(activeMemberLoginResponse.json<LoginResponse>().user.mustChangePassword).toBe(false);

    const regenerateActiveLoginResponse = await createMemberLogin(member.id);
    expect(regenerateActiveLoginResponse.statusCode).toBe(409);
  });

  it("rejects unauthorized member-core operations", async () => {
    const created = await createMemberAndReturn(adminToken);

    const memberListResponse = await app.inject({
      method: "GET",
      url: "/members",
      headers: authHeader(memberToken)
    });
    expect(memberListResponse.statusCode).toBe(403);

    const staffSuspendResponse = await app.inject({
      method: "POST",
      url: `/members/${created.id}/suspend`,
      headers: authHeader(staffToken),
      payload: {
        reason: "Nope"
      }
    });
    expect(staffSuspendResponse.statusCode).toBe(403);

    const memberArchiveResponse = await app.inject({
      method: "DELETE",
      url: `/members/${created.id}`,
      headers: authHeader(memberToken)
    });
    expect(memberArchiveResponse.statusCode).toBe(403);
  });

  async function seedUser(email: string, password: string, roleName: "GYM_OWNER" | "ADMIN" | "STAFF" | "MEMBER") {
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

  function createMember(token: string, payload: Record<string, unknown>) {
    return app.inject({
      method: "POST",
      url: "/members",
      headers: authHeader(token),
      payload
    });
  }

  async function createMemberAndReturn(token: string): Promise<MemberDto> {
    const response = await createMember(token, {
      firstName: "Noah",
      lastName: "Patel",
      phone: "+15550002001",
      heightCm: 180,
      weightKg: 82
    });

    expect(response.statusCode).toBe(201);
    return response.json<MemberResponse>().member;
  }

  function getMember(token: string, id: string) {
    return app.inject({
      method: "GET",
      url: `/members/${id}`,
      headers: authHeader(token)
    });
  }

  function createMemberLogin(memberId: string) {
    return app.inject({
      method: "POST",
      url: `/members/${memberId}/login`,
      headers: authHeader(adminToken)
    });
  }

  function syncMemberLoginUsers(): void {
    for (const user of memberRepository.loginUsers.values()) {
      authRepository.users.set(user.id, user);
    }
  }
});

function authHeader(token: string): { authorization: string } {
  return {
    authorization: `Bearer ${token}`
  };
}
