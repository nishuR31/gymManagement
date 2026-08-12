import type {
  AttendanceDto,
  CheckInMethod,
  DailyAttendanceDto,
  MemberDto,
  MonthlyAttendanceDto,
  PaginatedAttendanceDto,
  RoleName
} from "@gym/shared";
import { AppError, errors } from "../errors/app-error.js";
import {
  attendanceDailyCacheKey,
  attendanceMonthlyCacheKey,
  NullAttendanceAggregateCache,
  type AttendanceAggregateCache
} from "./attendance-cache.service.js";
import type { AuditWriter } from "./member.service.js";
import { MemberService } from "./member.service.js";
import {
  DuplicateOpenAttendanceError,
  type AttendanceRecord,
  type AttendanceRepository
} from "../repositories/attendance.repository.js";
import type { MemberRecord, MemberRepository } from "../repositories/member.repository.js";
import type { RequestActor, RequestContext } from "../types/auth.js";
import { invalidateDashboardAndReports, type AggregateCache } from "./aggregate-cache.service.js";

const qrPayloadPrefix = "gym-member:v1:";
const autoCheckoutHours = 12;

export interface CheckInInput {
  memberId?: string;
  qrPayload?: string;
  query?: string;
  checkInAt?: Date;
}

export interface CheckOutInput {
  memberId?: string;
  attendanceId?: string;
  checkOutAt?: Date;
}

export interface AttendanceDisambiguationDto {
  matches: MemberDto[];
}

export type CheckInResult =
  | {
      kind: "checked-in";
      attendance: AttendanceDto;
    }
  | {
      kind: "disambiguation";
      matches: MemberDto[];
    };

export interface AutoCheckoutResult {
  closedCount: number;
  attendances: AttendanceDto[];
}

export class AttendanceService {
  public constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly memberRepository: MemberRepository,
    private readonly memberService: MemberService,
    private readonly auditWriter: AuditWriter,
    private readonly clock: () => Date = () => new Date(),
    private readonly aggregateCache: AttendanceAggregateCache = new NullAttendanceAggregateCache(),
    private readonly dashboardReportCache?: AggregateCache
  ) {}

  public async checkIn(input: CheckInInput, actor: RequestActor, context: RequestContext): Promise<CheckInResult> {
    ensureStaffOrAbove(actor.role);
    const resolution = await this.resolveMemberForCheckIn(input);

    if (resolution.kind === "disambiguation") {
      return resolution;
    }

    await this.memberService.ensureMemberCanCheckIn(resolution.member.id);

    try {
      const attendance = await this.attendanceRepository.createOpenAttendance({
        memberId: resolution.member.id,
        checkInAt: input.checkInAt ?? this.clock(),
        checkInMethod: resolution.method,
        checkedInBy: actor.id
      });

      await this.auditWriter.writeAuditLog({
        userId: actor.id,
        action: "ATTENDANCE_CHECKED_IN",
        entity: "Attendance",
        entityId: attendance.id,
        metadata: {
          memberId: attendance.memberId,
          checkInMethod: attendance.checkInMethod
        },
        ...context
      });
      await this.invalidateAggregateCacheForAttendance(attendance);
      await invalidateDashboardAndReports(this.dashboardReportCache);

      return {
        kind: "checked-in",
        attendance: toAttendanceDto(attendance)
      };
    } catch (error: unknown) {
      if (error instanceof DuplicateOpenAttendanceError) {
        throw new AppError(409, "ALREADY_CHECKED_IN", "Member already has an open attendance session");
      }
      throw error;
    }
  }

  public async checkOut(input: CheckOutInput, actor: RequestActor, context: RequestContext): Promise<AttendanceDto> {
    ensureStaffOrAbove(actor.role);
    const attendance = await this.resolveOpenAttendanceForCheckout(input);
    const checkOutAt = input.checkOutAt ?? this.clock();
    const durationMinutes = calculateDurationMinutes(attendance.checkInAt, checkOutAt);
    const closed = await this.attendanceRepository.closeAttendance({
      id: attendance.id,
      checkOutAt,
      durationMinutes,
      autoClosed: false
    });

    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "ATTENDANCE_CHECKED_OUT",
      entity: "Attendance",
      entityId: closed.id,
      metadata: {
        memberId: closed.memberId,
        durationMinutes
      },
      ...context
    });
    await this.invalidateAggregateCacheForAttendance(closed);
    await invalidateDashboardAndReports(this.dashboardReportCache);

    return toAttendanceDto(closed);
  }

  public async listCurrent(actor: RequestActor): Promise<AttendanceDto[]> {
    ensureStaffOrAbove(actor.role);
    const attendances = await this.attendanceRepository.listCurrent();
    return attendances.map(toAttendanceDto);
  }

  public async autoCloseStaleAttendances(): Promise<AutoCheckoutResult> {
    const cutoff = new Date(this.clock().getTime() - autoCheckoutHours * 60 * 60 * 1000);
    const staleAttendances = await this.attendanceRepository.findOpenBefore(cutoff);
    const closed: AttendanceDto[] = [];

    for (const attendance of staleAttendances) {
      const checkOutAt = new Date(attendance.checkInAt.getTime() + autoCheckoutHours * 60 * 60 * 1000);
      const closedAttendance = await this.attendanceRepository.closeAttendance({
        id: attendance.id,
        checkOutAt,
        durationMinutes: calculateDurationMinutes(attendance.checkInAt, checkOutAt),
        autoClosed: true
      });
      await this.auditWriter.writeAuditLog({
        action: "ATTENDANCE_AUTO_CLOSED",
        entity: "Attendance",
        entityId: closedAttendance.id,
        metadata: {
          memberId: closedAttendance.memberId,
          durationMinutes: closedAttendance.durationMinutes
        }
      });
      await this.invalidateAggregateCacheForAttendance(closedAttendance);
      await invalidateDashboardAndReports(this.dashboardReportCache);
      closed.push(toAttendanceDto(closedAttendance));
    }

    return {
      closedCount: closed.length,
      attendances: closed
    };
  }

  public async getAttendanceForDate(date: Date): Promise<AttendanceDto[]> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const attendances = await this.attendanceRepository.getAttendanceForDate(start, end);
    return attendances.map(toAttendanceDto);
  }

  public async listMemberAttendance(
    memberId: string,
    page: number,
    pageSize: number,
    actor: RequestActor
  ): Promise<PaginatedAttendanceDto> {
    const member = await this.memberRepository.findById(memberId);
    if (!member) {
      throw errors.notFound("Member not found");
    }
    ensureCanReadMemberAttendance(member, actor);

    const result = await this.attendanceRepository.listForMember(memberId, page, pageSize);
    return {
      data: result.attendances.map(toAttendanceDto),
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize)
      }
    };
  }

  public async getDailyAttendance(date: string, actor: RequestActor): Promise<DailyAttendanceDto> {
    ensureStaffOrAbove(actor.role);
    const cacheKey = attendanceDailyCacheKey(date);
    const cached = await this.aggregateCache.get<DailyAttendanceDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await this.getAttendanceForDate(parseIsoDateOnly(date));
    const result: DailyAttendanceDto = {
      date,
      count: data.length,
      data
    };
    await this.aggregateCache.set(cacheKey, result);
    return result;
  }

  public async getMonthlyAttendance(month: string, actor: RequestActor): Promise<MonthlyAttendanceDto> {
    ensureStaffOrAbove(actor.role);
    const cacheKey = attendanceMonthlyCacheKey(month);
    const cached = await this.aggregateCache.get<MonthlyAttendanceDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const { start, end } = monthRange(month);
    const counts = await this.attendanceRepository.countByCheckInDay(start, end);
    const countByDate = new Map(counts.map((row) => [row.date, row.count]));
    const days: MonthlyAttendanceDto["days"] = [];

    for (const date of datesInMonth(month)) {
      days.push({
        date,
        count: countByDate.get(date) ?? 0
      });
    }

    const result: MonthlyAttendanceDto = {
      month,
      days
    };
    await this.aggregateCache.set(cacheKey, result);
    return result;
  }

  private async resolveMemberForCheckIn(input: CheckInInput): Promise<
    | {
        kind: "member";
        member: MemberRecord;
        method: CheckInMethod;
      }
    | {
        kind: "disambiguation";
        matches: MemberDto[];
      }
  > {
    const providedKeys = [input.memberId, input.qrPayload, input.query].filter((value) => value !== undefined);

    if (providedKeys.length !== 1) {
      throw errors.badRequest("Provide exactly one of memberId, qrPayload, or query");
    }

    if (input.memberId) {
      const member = await this.memberRepository.findById(input.memberId);
      if (!member) {
        throw errors.notFound("Member not found");
      }
      return {
        kind: "member",
        member,
        method: "MEMBER_ID"
      };
    }

    if (input.qrPayload) {
      const qrSecret = parseQrPayload(input.qrPayload);
      const member = qrSecret ? await this.memberRepository.findByQrSecret(qrSecret) : null;
      if (!member) {
        throw errors.notFound("Member not found");
      }
      return {
        kind: "member",
        member,
        method: "QR"
      };
    }

    const query = input.query?.trim();
    if (!query) {
      throw errors.badRequest("Query is required");
    }

    const exactMemberCodeMatch = await this.memberRepository.findByMemberCode(query);
    if (exactMemberCodeMatch) {
      return {
        kind: "member",
        member: exactMemberCodeMatch,
        method: "USERNAME_SEARCH"
      };
    }

    const matches = await this.memberRepository.searchForAttendance(query, 6);
    if (matches.length === 0) {
      throw errors.notFound("Member not found");
    }

    if (matches.length > 1) {
      return {
        kind: "disambiguation",
        matches: matches.map((member) => toMemberSummaryDto(member))
      };
    }

    const [member] = matches;
    if (!member) {
      throw errors.notFound("Member not found");
    }

    return {
      kind: "member",
      member,
      method: "USERNAME_SEARCH"
    };
  }

  private async resolveOpenAttendanceForCheckout(input: CheckOutInput): Promise<AttendanceRecord> {
    const providedKeys = [input.memberId, input.attendanceId].filter((value) => value !== undefined);

    if (providedKeys.length !== 1) {
      throw errors.badRequest("Provide exactly one of memberId or attendanceId");
    }

    if (input.attendanceId) {
      const attendance = await this.attendanceRepository.findById(input.attendanceId);

      if (!attendance) {
        throw errors.notFound("Attendance record not found");
      }

      if (attendance.checkOutAt) {
        throw new AppError(409, "ATTENDANCE_ALREADY_CLOSED", "Attendance record is already checked out");
      }

      return attendance;
    }

    if (!input.memberId) {
      throw errors.badRequest("memberId is required");
    }

    const attendance = await this.attendanceRepository.findOpenByMemberId(input.memberId);

    if (!attendance) {
      throw new AppError(404, "OPEN_ATTENDANCE_NOT_FOUND", "No open attendance session found for member");
    }

    return attendance;
  }

  private async invalidateAggregateCacheForAttendance(attendance: AttendanceRecord): Promise<void> {
    const date = toDateKey(attendance.checkInAt);
    const month = date.slice(0, 7);

    try {
      await this.aggregateCache.delete([attendanceDailyCacheKey(date), attendanceMonthlyCacheKey(month)]);
    } catch {
      return;
    }
  }
}

function ensureStaffOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF") {
    return;
  }

  throw errors.forbidden();
}

function parseQrPayload(qrPayload: string): string | null {
  if (!qrPayload.startsWith(qrPayloadPrefix)) {
    return null;
  }

  const secret = qrPayload.slice(qrPayloadPrefix.length);
  return secret.length > 0 ? secret : null;
}

function calculateDurationMinutes(checkInAt: Date, checkOutAt: Date): number {
  return Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000));
}

function toAttendanceDto(attendance: AttendanceRecord): AttendanceDto {
  return {
    id: attendance.id,
    memberId: attendance.memberId,
    checkInAt: attendance.checkInAt.toISOString(),
    checkOutAt: attendance.checkOutAt?.toISOString() ?? null,
    checkInMethod: attendance.checkInMethod,
    checkedInBy: attendance.checkedInBy,
    durationMinutes: attendance.durationMinutes,
    autoClosed: attendance.autoClosed,
    member: attendance.member
  };
}

function toMemberSummaryDto(member: MemberRecord): MemberDto {
  return {
    id: member.id,
    memberCode: member.memberCode,
    userId: member.userId,
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    email: member.email,
    dateOfBirth: member.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    gender: member.gender,
    address: member.address,
    emergencyContactName: member.emergencyContactName,
    emergencyContactPhone: member.emergencyContactPhone,
    heightCm: member.heightCm,
    weightKg: member.weightKg,
    bmi: null,
    status: member.status,
    joinedAt: member.joinedAt.toISOString(),
    suspendedAt: member.suspendedAt?.toISOString() ?? null,
    suspendedReason: member.suspendedReason,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString()
  };
}

function ensureCanReadMemberAttendance(member: MemberRecord, actor: RequestActor): void {
  if (actor.role === "SUPER_ADMIN" || actor.role === "GYM_OWNER" || actor.role === "ADMIN" || actor.role === "STAFF") {
    return;
  }

  if (actor.role === "MEMBER" && member.userId === actor.id) {
    return;
  }

  throw errors.forbidden();
}

function parseIsoDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthRange(month: string): { start: Date; end: Date } {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const zeroBasedMonth = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, zeroBasedMonth, 1));
  const end = new Date(Date.UTC(year, zeroBasedMonth + 1, 1));
  return { start, end };
}

function datesInMonth(month: string): string[] {
  const { start, end } = monthRange(month);
  const dates: string[] = [];

  for (let current = start; current < end; current = new Date(current.getTime() + 24 * 60 * 60 * 1000)) {
    dates.push(toDateKey(current));
  }

  return dates;
}
