import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AttendanceDto, AuthUserDto, DailyAttendanceDto, MonthlyAttendanceDto, PaginatedAttendanceDto, RoleName } from "@gym/shared";
import { buildApp } from "../src/app.js";
import type { Env } from "../src/config/env.js";
import { AttendanceService } from "../src/services/attendance.service.js";
import { MemberService } from "../src/services/member.service.js";
import { hashPassword } from "../src/utils/password.js";
import { InMemoryAttendanceRepository } from "./in-memory-attendance-repository.js";
import { InMemoryAttendanceCache } from "./in-memory-attendance-cache.js";
import { InMemoryAuthRepository } from "./in-memory-auth-repository.js";
import { InMemoryMemberRepository } from "./in-memory-member-repository.js";

interface LoginResponse {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
}

interface AttendanceResponse {
  attendance: AttendanceDto;
}

interface CurrentAttendanceResponse {
  data: AttendanceDto[];
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
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

describe("attendance routes", () => {
  let app: FastifyInstance;
  let authRepository: InMemoryAuthRepository;
  let memberRepository: InMemoryMemberRepository;
  let attendanceRepository: InMemoryAttendanceRepository;
  let attendanceCache: InMemoryAttendanceCache;
  let staffToken: string;
  let now: Date;

  beforeEach(async () => {
    now = new Date("2026-08-01T10:00:00.000Z");
    authRepository = new InMemoryAuthRepository();
    memberRepository = new InMemoryMemberRepository();
    attendanceRepository = new InMemoryAttendanceRepository(memberRepository);
    attendanceCache = new InMemoryAttendanceCache();
    app = await buildApp({
      env: testEnv,
      authRepository,
      memberRepository,
      attendanceRepository,
      attendanceCache,
      enableRateLimit: false,
      enableJobs: false,
      clock: () => now
    });

    await seedUser("staff@example.com", "StaffPass123", "STAFF");
    staffToken = await login("staff@example.com", "StaffPass123");
  });

  afterEach(async () => {
    await app.close();
  });

  it("runs a normal check-in and check-out cycle with stored duration", async () => {
    const member = await createMember("Ava", "Shah");

    const checkInResponse = await app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: authHeader(staffToken),
      payload: {
        memberId: member.id
      }
    });

    expect(checkInResponse.statusCode).toBe(201);
    expect(checkInResponse.json<AttendanceResponse>().attendance.durationMinutes).toBeNull();

    const currentResponse = await app.inject({
      method: "GET",
      url: "/attendance/current",
      headers: authHeader(staffToken)
    });
    expect(currentResponse.statusCode).toBe(200);
    expect(currentResponse.json<CurrentAttendanceResponse>().data).toHaveLength(1);

    now = new Date("2026-08-01T11:25:00.000Z");
    const checkOutResponse = await app.inject({
      method: "POST",
      url: "/attendance/check-out",
      headers: authHeader(staffToken),
      payload: {
        memberId: member.id
      }
    });

    expect(checkOutResponse.statusCode).toBe(200);
    const closed = checkOutResponse.json<AttendanceResponse>().attendance;
    expect(closed.durationMinutes).toBe(85);
    expect(closed.autoClosed).toBe(false);
  });

  it("rejects duplicate check-in and leaves only one open attendance row", async () => {
    const member = await createMember("Noah", "Patel");

    const firstResponse = await checkInByMemberId(member.id);
    expect(firstResponse.statusCode).toBe(201);

    const duplicateResponse = await checkInByMemberId(member.id);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json<ErrorResponse>().error.code).toBe("ALREADY_CHECKED_IN");
    expect(await attendanceRepository.countOpenForMember(member.id)).toBe(1);
  });

  it("blocks suspended members from check-in with a specific error code", async () => {
    const member = await createMember("Mira", "Singh");
    await memberRepository.setStatus(member.id, "SUSPENDED", "Payment overdue");

    const response = await checkInByMemberId(member.id);

    expect(response.statusCode).toBe(409);
    expect(response.json<ErrorResponse>().error.code).toBe("MEMBER_SUSPENDED");
  });

  it("allows only one concurrent check-in for the same member", async () => {
    const member = await createMember("Leo", "Mehta");

    const responses = await Promise.all(Array.from({ length: 10 }, () => checkInByMemberId(member.id)));
    const statuses = responses.map((response) => response.statusCode);

    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(9);
    expect(await attendanceRepository.countOpenForMember(member.id)).toBe(1);
  });

  it("calculates overnight duration and attributes the row to the check-in date", async () => {
    const member = await createMember("Ira", "Kapoor");
    now = new Date("2026-08-01T23:40:00.000Z");
    const checkInResponse = await checkInByMemberId(member.id);
    const attendanceId = checkInResponse.json<AttendanceResponse>().attendance.id;

    now = new Date("2026-08-02T00:20:00.000Z");
    const checkOutResponse = await app.inject({
      method: "POST",
      url: "/attendance/check-out",
      headers: authHeader(staffToken),
      payload: {
        attendanceId
      }
    });

    expect(checkOutResponse.statusCode).toBe(200);
    expect(checkOutResponse.json<AttendanceResponse>().attendance.durationMinutes).toBe(40);

    const service = createAttendanceService();
    const checkInDateRows = await service.getAttendanceForDate(new Date("2026-08-01T12:00:00.000Z"));
    const nextDateRows = await service.getAttendanceForDate(new Date("2026-08-02T12:00:00.000Z"));
    expect(checkInDateRows.map((row) => row.id)).toContain(attendanceId);
    expect(nextDateRows.map((row) => row.id)).not.toContain(attendanceId);
  });

  it("auto-closes stale open sessions at the 12 hour cutoff", async () => {
    const member = await createMember("Sara", "Rao");
    now = new Date("2026-08-01T06:00:00.000Z");
    const checkInResponse = await checkInByMemberId(member.id);
    const attendanceId = checkInResponse.json<AttendanceResponse>().attendance.id;

    now = new Date("2026-08-01T19:01:00.000Z");
    const result = await createAttendanceService().autoCloseStaleAttendances();

    expect(result.closedCount).toBe(1);
    const closed = attendanceRepository.attendances.get(attendanceId);
    expect(closed?.autoClosed).toBe(true);
    expect(closed?.durationMinutes).toBe(720);
    expect(closed?.checkOutAt?.toISOString()).toBe("2026-08-01T18:00:00.000Z");
    expect(await attendanceRepository.countOpenForMember(member.id)).toBe(0);
  });

  it("checks in with current QR payload and rejects a rotated-out QR payload", async () => {
    const member = await createMember("Dev", "Nair", "qr-original");

    const qrResponse = await app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: authHeader(staffToken),
      payload: {
        qrPayload: "gym-member:v1:qr-original"
      }
    });
    expect(qrResponse.statusCode).toBe(201);

    await app.inject({
      method: "POST",
      url: "/attendance/check-out",
      headers: authHeader(staffToken),
      payload: {
        memberId: member.id
      }
    });
    await memberRepository.updateQrSecret(member.id, "qr-rotated");

    const staleQrResponse = await app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: authHeader(staffToken),
      payload: {
        qrPayload: "gym-member:v1:qr-original"
      }
    });

    expect(staleQrResponse.statusCode).toBe(404);
    expect(staleQrResponse.json<ErrorResponse>().error.code).toBe("NOT_FOUND");
  });

  it("returns paginated member history with staff and self-access RBAC", async () => {
    const memberUser = await seedUser("member-history@example.com", "MemberPass123", "MEMBER");
    const otherMemberUser = await seedUser("other-member@example.com", "MemberPass123", "MEMBER");
    const memberToken = await login("member-history@example.com", "MemberPass123");
    const otherMemberToken = await login("other-member@example.com", "MemberPass123");
    const member = await createMember("Ria", "Das", "ria-qr", memberUser.id);

    await createClosedAttendance(member.id, "2026-08-01T09:00:00.000Z", "2026-08-01T10:00:00.000Z");
    await createClosedAttendance(member.id, "2026-08-02T09:00:00.000Z", "2026-08-02T10:30:00.000Z");

    const staffResponse = await app.inject({
      method: "GET",
      url: `/members/${member.id}/attendance?page=1&pageSize=1`,
      headers: authHeader(staffToken)
    });
    expect(staffResponse.statusCode).toBe(200);
    const staffBody = staffResponse.json<PaginatedAttendanceDto>();
    expect(staffBody.pagination.total).toBe(2);
    expect(staffBody.data).toHaveLength(1);
    expect(staffBody.data[0]?.checkInAt).toBe("2026-08-02T09:00:00.000Z");

    const selfResponse = await app.inject({
      method: "GET",
      url: `/members/${member.id}/attendance`,
      headers: authHeader(memberToken)
    });
    expect(selfResponse.statusCode).toBe(200);

    const otherResponse = await app.inject({
      method: "GET",
      url: `/members/${member.id}/attendance`,
      headers: authHeader(otherMemberToken)
    });
    expect(otherResponse.statusCode).toBe(403);
  });

  it("daily endpoint attributes overnight sessions to the check-in date", async () => {
    const member = await createMember("Ovi", "Night");
    await createClosedAttendance(member.id, "2026-08-01T23:40:00.000Z", "2026-08-02T00:20:00.000Z");

    const checkInDateResponse = await app.inject({
      method: "GET",
      url: "/attendance/daily?date=2026-08-01",
      headers: authHeader(staffToken)
    });
    const nextDateResponse = await app.inject({
      method: "GET",
      url: "/attendance/daily?date=2026-08-02",
      headers: authHeader(staffToken)
    });

    expect(checkInDateResponse.statusCode).toBe(200);
    expect(checkInDateResponse.json<DailyAttendanceDto>().count).toBe(1);
    expect(nextDateResponse.statusCode).toBe(200);
    expect(nextDateResponse.json<DailyAttendanceDto>().count).toBe(0);
  });

  it("monthly endpoint aggregates counts and includes zero-attendance days", async () => {
    const firstMember = await createMember("Month", "One");
    const secondMember = await createMember("Month", "Two");
    await createClosedAttendance(firstMember.id, "2026-08-01T09:00:00.000Z", "2026-08-01T10:00:00.000Z");
    await createClosedAttendance(secondMember.id, "2026-08-03T09:00:00.000Z", "2026-08-03T10:00:00.000Z");
    await createClosedAttendance(firstMember.id, "2026-08-03T11:00:00.000Z", "2026-08-03T12:00:00.000Z");

    const response = await app.inject({
      method: "GET",
      url: "/attendance/monthly?month=2026-08",
      headers: authHeader(staffToken)
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<MonthlyAttendanceDto>();
    expect(body.days).toHaveLength(31);
    expect(body.days.find((day) => day.date === "2026-08-01")?.count).toBe(1);
    expect(body.days.find((day) => day.date === "2026-08-02")?.count).toBe(0);
    expect(body.days.find((day) => day.date === "2026-08-03")?.count).toBe(2);
  });

  it("invalidates cached aggregates on check-in so daily reads are immediately fresh", async () => {
    const member = await createMember("Cache", "Case");

    const firstDailyResponse = await app.inject({
      method: "GET",
      url: "/attendance/daily?date=2026-08-01",
      headers: authHeader(staffToken)
    });
    expect(firstDailyResponse.statusCode).toBe(200);
    expect(firstDailyResponse.json<DailyAttendanceDto>().count).toBe(0);

    const checkInResponse = await checkInByMemberId(member.id);
    expect(checkInResponse.statusCode).toBe(201);

    const secondDailyResponse = await app.inject({
      method: "GET",
      url: "/attendance/daily?date=2026-08-01",
      headers: authHeader(staffToken)
    });
    expect(secondDailyResponse.statusCode).toBe(200);
    expect(secondDailyResponse.json<DailyAttendanceDto>().count).toBe(1);
    expect(attendanceCache.deletedKeys).toContain("attendance:daily:2026-08-01");
    expect(attendanceCache.deletedKeys).toContain("attendance:monthly:2026-08");
  });

  it("rejects invalid daily and monthly query parameters with 400", async () => {
    const dailyResponse = await app.inject({
      method: "GET",
      url: "/attendance/daily?date=2026-02-31",
      headers: authHeader(staffToken)
    });
    const monthlyResponse = await app.inject({
      method: "GET",
      url: "/attendance/monthly?month=2026-13",
      headers: authHeader(staffToken)
    });

    expect(dailyResponse.statusCode).toBe(400);
    expect(monthlyResponse.statusCode).toBe(400);
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

  async function createMember(firstName: string, lastName: string, qrSecret = `${firstName}-${lastName}-qr`, userId?: string) {
    return memberRepository.create({
      ...(userId ? { userId } : {}),
      firstName,
      lastName,
      phone: "+15550003000",
      qrSecret
    });
  }

  async function createClosedAttendance(memberId: string, checkInAt: string, checkOutAt: string): Promise<AttendanceDto> {
    const opened = await attendanceRepository.createOpenAttendance({
      memberId,
      checkInAt: new Date(checkInAt),
      checkInMethod: "MEMBER_ID",
      checkedInBy: "staff-test"
    });
    const checkIn = new Date(checkInAt);
    const checkOut = new Date(checkOutAt);
    const closed = await attendanceRepository.closeAttendance({
      id: opened.id,
      checkOutAt: checkOut,
      durationMinutes: Math.round((checkOut.getTime() - checkIn.getTime()) / 60000),
      autoClosed: false
    });
    return {
      ...closed,
      checkInAt: closed.checkInAt.toISOString(),
      checkOutAt: closed.checkOutAt?.toISOString() ?? null
    };
  }

  function checkInByMemberId(memberId: string) {
    return app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: authHeader(staffToken),
      payload: {
        memberId
      }
    });
  }

  function createAttendanceService(): AttendanceService {
    const memberService = new MemberService(memberRepository, authRepository);
    return new AttendanceService(
      attendanceRepository,
      memberRepository,
      memberService,
      authRepository,
      () => now
    );
  }
});

function authHeader(token: string): { authorization: string } {
  return {
    authorization: `Bearer ${token}`
  };
}
