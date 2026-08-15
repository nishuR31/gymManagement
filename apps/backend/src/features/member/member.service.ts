import crypto from "node:crypto";
import type { MemberDto, MemberLoginSetupDto, MemberStatus, RoleName } from "@gym/shared";
import { AppError } from "../../core/errors/app-error.js";
import { errors } from "../../core/errors/app-error.js";
import type { AuditLogInput } from "../../features/auth/auth.repository.js";
import {
  LinkedUserNotMemberError,
  MemberEmailRequiredError,
  MemberLoginAlreadyActiveError,
  MemberLoginEmailConflictError,
  type MemberRecord,
  type MemberRepository,
  type UpdateMemberInput
} from "./member.repository.js";
import type { MembershipRepository } from "../../features/membership/membership.repository.js";
import type { AttendanceRepository } from "../../features/attendance/attendance.repository.js";
import type { PaymentRepository } from "../../features/payment/payment.repository.js";
import type { RequestActor, RequestContext } from "../../core/types/auth.js";
import { createQrSecret } from "../../core/utils/qr-secret.js";
import { hashPassword } from "../../core/utils/password.js";
import { invalidateDashboardAndReports, type CacheService } from "../../core/cache/cache.service.js";

export interface AuditWriter {
  writeAuditLog(input: AuditLogInput): Promise<void>;
}

export interface ListMembersInput {
  page: number;
  pageSize: number;
  status?: MemberStatus;
  search?: string;
}

export interface CreateMemberInput {
  userId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
  heightCm?: number;
  weightKg?: number;
  joinedAt?: Date;
}

export interface MemberListDto {
  data: MemberDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MemberQrDto {
  memberId: string;
  memberCode: string;
  qrPayload: string;
}

export class MemberService {
  public constructor(
    private readonly repository: MemberRepository,
    private readonly auditWriter: AuditWriter,
    private readonly membershipRepository?: MembershipRepository,
    private readonly attendanceRepository?: AttendanceRepository,
    private readonly paymentRepository?: PaymentRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly dashboardReportCache?: CacheService
  ) {}

  public async listMembers(input: ListMembersInput, actor: RequestActor): Promise<MemberListDto> {
    ensureOneOf(actor.role, ["SUPER_ADMIN", "GYM_OWNER", "ADMIN", "STAFF"]);
    const result = await this.repository.list(input);

    // If you need streaks for all list, fetch them here. However, to keep it performant, 
    // we will leave streakDays undefined in list unless strictly needed.
    return {
      data: result.members.map((member) => toMemberDto(member, { includeMedicalNotes: false })),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize)
      }
    };
  }

  public async getMember(id: string, actor: RequestActor): Promise<MemberDto> {
    const member = await this.findMemberOrThrow(id);
    ensureCanReadMember(member, actor);

    const enriched = await this.enrichMemberData(member.id);

    return toMemberDto(member, {
      includeMedicalNotes: canReadMedicalNotes(member, actor),
      ...enriched
    });
  }

  public async getCurrentMember(actor: RequestActor): Promise<MemberDto> {
    if (actor.role !== "MEMBER") {
      throw errors.forbidden();
    }
    const member = await this.repository.findByUserId(actor.id);
    if (!member) {
      throw errors.notFound("Member not found");
    }

    const enriched = await this.enrichMemberData(member.id);

    return toMemberDto(member, {
      includeMedicalNotes: true,
      ...enriched
    });
  }

  public async createMember(input: CreateMemberInput, actor: RequestActor, context: RequestContext): Promise<MemberDto> {
    ensureOneOf(actor.role, ["SUPER_ADMIN", "GYM_OWNER", "ADMIN", "STAFF"]);
    ensureCanWriteMedicalNotes(input, actor);

    if (input.userId) {
      const role = await this.repository.findUserRole(input.userId);
      if (role !== "MEMBER") {
        throw errors.badRequest("Linked user must exist and have MEMBER role");
      }
    }

    const member = await this.repository.create({
      ...input,
      qrSecret: createQrSecret()
    });

    if (member.heightCm !== null && member.weightKg !== null) {
      await this.repository.addMeasurement({
        memberId: member.id,
        heightCm: member.heightCm,
        weightKg: member.weightKg
      });
    }

    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBER_CREATED",
      entity: "Member",
      entityId: member.id,
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);

    return toMemberDto(member, { includeMedicalNotes: canReadMedicalNotes(member, actor) });
  }

  public async updateMember(
    id: string,
    input: UpdateMemberInput,
    actor: RequestActor,
    context: RequestContext
  ): Promise<MemberDto> {
    ensureOneOf(actor.role, ["SUPER_ADMIN", "GYM_OWNER", "ADMIN", "STAFF"]);
    ensureCanWriteMedicalNotes(input, actor);

    const existing = await this.findMemberOrThrow(id);
    ensureMutable(existing);

    const member = await this.repository.update(id, input);

    if (member.heightCm !== existing.heightCm || member.weightKg !== existing.weightKg) {
      if (member.heightCm !== null && member.weightKg !== null) {
        await this.repository.addMeasurement({
          memberId: member.id,
          heightCm: member.heightCm,
          weightKg: member.weightKg
        });
      }
    }

    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBER_UPDATED",
      entity: "Member",
      entityId: member.id,
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);

    return toMemberDto(member, { includeMedicalNotes: canReadMedicalNotes(member, actor) });
  }

  public async archiveMember(id: string, actor: RequestActor, context: RequestContext): Promise<MemberDto> {
    ensureOneOf(actor.role, ["SUPER_ADMIN", "GYM_OWNER", "ADMIN"]);
    const existing = await this.findMemberOrThrow(id);
    ensureMutable(existing);

    const member = await this.repository.setStatus(id, "ARCHIVED", null);
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBER_ARCHIVED",
      entity: "Member",
      entityId: member.id,
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);

    return toMemberDto(member, { includeMedicalNotes: canReadMedicalNotes(member, actor) });
  }

  public async suspendMember(
    id: string,
    reason: string,
    actor: RequestActor,
    context: RequestContext
  ): Promise<MemberDto> {
    ensureOneOf(actor.role, ["SUPER_ADMIN", "GYM_OWNER", "ADMIN"]);
    const existing = await this.findMemberOrThrow(id);
    ensureMutable(existing);

    const member = await this.repository.setStatus(id, "SUSPENDED", reason);
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBER_SUSPENDED",
      entity: "Member",
      entityId: member.id,
      metadata: { reason },
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);

    return toMemberDto(member, { includeMedicalNotes: canReadMedicalNotes(member, actor) });
  }

  public async restoreMember(id: string, actor: RequestActor, context: RequestContext): Promise<MemberDto> {
    ensureOneOf(actor.role, ["SUPER_ADMIN", "GYM_OWNER", "ADMIN"]);
    const existing = await this.findMemberOrThrow(id);

    if (existing.status === "ARCHIVED") {
      throw errors.conflict("Archived members cannot be restored");
    }

    const member = await this.repository.setStatus(id, "ACTIVE", null);
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBER_RESTORED",
      entity: "Member",
      entityId: member.id,
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);

    return toMemberDto(member, { includeMedicalNotes: canReadMedicalNotes(member, actor) });
  }

  public async regenerateQr(id: string, actor: RequestActor, context: RequestContext): Promise<MemberQrDto> {
    ensureOneOf(actor.role, ["SUPER_ADMIN", "GYM_OWNER", "ADMIN"]);
    const existing = await this.findMemberOrThrow(id);
    ensureMutable(existing);

    const member = await this.repository.updateQrSecret(id, createQrSecret());
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "MEMBER_QR_REGENERATED",
      entity: "Member",
      entityId: member.id,
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);

    return toQrDto(member);
  }

  public async getQr(id: string, actor: RequestActor): Promise<MemberQrDto> {
    const member = await this.findMemberOrThrow(id);
    ensureCanReadMember(member, actor);
    return toQrDto(member);
  }

  public async createOrRegenerateLogin(id: string, actor: RequestActor, context: RequestContext): Promise<MemberLoginSetupDto> {
    ensureOneOf(actor.role, ["SUPER_ADMIN", "GYM_OWNER", "ADMIN"]);
    const existing = await this.findMemberOrThrow(id);
    ensureMutable(existing);

    if (!existing.email) {
      throw errors.badRequest("Member email is required to create a login");
    }

    const temporaryPassword = createTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    try {
      const result = await this.repository.createOrRegenerateLogin(id, passwordHash);
      await Promise.all([
      this.auditWriter.writeAuditLog({
        userId: actor.id,
        action: result.regenerated ? "MEMBER_LOGIN_REGENERATED" : "MEMBER_LOGIN_CREATED",
        entity: "Member",
        entityId: result.member.id,
        metadata: { userId: result.user.id },
        ...context
      }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);

      return {
        member: toMemberDto(result.member, { includeMedicalNotes: canReadMedicalNotes(result.member, actor) }),
        user: toUserDto(result.user),
        temporaryPassword,
        regenerated: result.regenerated
      };
    } catch (error) {
      if (error instanceof MemberEmailRequiredError) {
        throw errors.badRequest("Member email is required to create a login");
      }
      if (error instanceof MemberLoginAlreadyActiveError) {
        throw errors.conflict("Member login is already active");
      }
      if (error instanceof MemberLoginEmailConflictError) {
        throw errors.conflict("A user with this member email already exists");
      }
      if (error instanceof LinkedUserNotMemberError) {
        throw errors.badRequest("Linked user must have MEMBER role");
      }
      throw error;
    }
  }

  public async ensureMemberCanCheckIn(id: string): Promise<void> {
    const member = await this.findMemberOrThrow(id);

    if (member.status === "SUSPENDED") {
      throw new AppError(409, "MEMBER_SUSPENDED", "Member is suspended and cannot check in");
    }

    if (member.status === "ARCHIVED") {
      throw new AppError(409, "MEMBER_ARCHIVED", "Member is archived and cannot check in");
    }

    if (this.membershipRepository) {
      const subscription = await this.membershipRepository.findAccessSubscriptionForMember(id, this.clock());
      if (!subscription) {
        throw new AppError(409, "NO_ACTIVE_MEMBERSHIP", "Member does not have an active or in-grace membership");
      }
    }
  }

  private async findMemberOrThrow(id: string): Promise<MemberRecord> {
    const member = await this.repository.findById(id);

    if (!member) {
      throw errors.notFound("Member not found");
    }

    return member;
  }

  private async enrichMemberData(memberId: string): Promise<{ streakDays?: number; lastAttendanceDate?: string | null; notices?: string[] }> {
    let streakDays: number | undefined = undefined;
    let lastAttendanceDate: string | null | undefined = undefined;
    const notices: string[] = [];

    const now = this.clock();

    if (this.attendanceRepository) {
      const stats = await this.attendanceRepository.getStreakAndLastAttendance(memberId, now);
      streakDays = stats.streak;
      lastAttendanceDate = stats.lastAttendance?.toISOString() ?? null;
    }

    if (this.membershipRepository) {
      const expiring = await this.membershipRepository.listExpiringSoon(now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      if (expiring.some(s => s.memberId === memberId)) {
        notices.push("EXPIRING_SOON");
      }
    }

    if (this.paymentRepository) {
      const invoices = await this.paymentRepository.listInvoicesForMember(memberId);
      if (invoices.some(i => i.status === "PENDING" || i.status === "PARTIALLY_PAID")) {
        notices.push("FEE_DUE");
      }
    }

    const result: { streakDays?: number; lastAttendanceDate?: string | null; notices?: string[] } = {};
    if (streakDays !== undefined) result.streakDays = streakDays;
    if (lastAttendanceDate !== undefined) result.lastAttendanceDate = lastAttendanceDate;
    if (notices.length > 0) result.notices = notices;
    return result;
  }
}

function ensureOneOf(role: RoleName, allowedRoles: readonly RoleName[]): void {
  if (!allowedRoles.includes(role)) {
    throw errors.forbidden();
  }
}

function ensureCanReadMember(member: MemberRecord, actor: RequestActor): void {
  if (["SUPER_ADMIN", "GYM_OWNER", "ADMIN", "STAFF"].includes(actor.role)) {
    return;
  }

  if (actor.role === "MEMBER" && member.userId === actor.id) {
    return;
  }

  throw errors.forbidden();
}

function canReadMedicalNotes(member: MemberRecord, actor: RequestActor): boolean {
  return (
    actor.role === "SUPER_ADMIN" ||
    actor.role === "GYM_OWNER" ||
    actor.role === "ADMIN" ||
    (actor.role === "MEMBER" && member.userId === actor.id)
  );
}

function ensureCanWriteMedicalNotes(input: { medicalNotes?: string | null }, actor: RequestActor): void {
  if (input.medicalNotes === undefined) {
    return;
  }

  if (actor.role === "SUPER_ADMIN" || actor.role === "GYM_OWNER" || actor.role === "ADMIN") {
    return;
  }

  throw errors.forbidden("Medical notes are restricted to admin roles");
}

function ensureMutable(member: MemberRecord): void {
  if (member.status === "ARCHIVED") {
    throw errors.conflict("Archived members cannot be modified");
  }
}



export function toMemberDto(
  member: MemberRecord,
  options: {
    includeMedicalNotes: boolean;
    streakDays?: number;
    lastAttendanceDate?: string | null;
    notices?: string[];
  }
): MemberDto {
  const dto: MemberDto = {
    id: member.id,
    memberCode: member.memberCode,
    userId: member.userId,
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    email: member.email,
    dateOfBirth: toIsoDate(member.dateOfBirth),
    gender: member.gender,
    address: member.address,
    emergencyContactName: member.emergencyContactName,
    emergencyContactPhone: member.emergencyContactPhone,
    ...(options.includeMedicalNotes ? { medicalNotes: member.medicalNotes } : {}),
    heightCm: member.heightCm,
    weightKg: member.weightKg,
    bmi: calculateBmi(member.heightCm, member.weightKg),
    status: member.status,
    joinedAt: member.joinedAt.toISOString(),
    suspendedAt: member.suspendedAt?.toISOString() ?? null,
    suspendedReason: member.suspendedReason,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString()
  };

  if (options.lastAttendanceDate !== undefined) {
    dto.lastAttendanceDate = options.lastAttendanceDate;
  }
  if (options.streakDays !== undefined) {
    dto.streakDays = options.streakDays;
  }
  if (options.notices !== undefined) {
    dto.notices = options.notices;
  }

  return dto;
}

function toUserDto(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleName;
  mustChangePassword: boolean;
  twoFactorEnabled?: boolean;
  hasPasskeys?: boolean;
  securityDisableRequested?: boolean;
}): MemberLoginSetupDto["user"] {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    hasPasskeys: user.hasPasskeys ?? false,
    securityDisableRequested: user.securityDisableRequested ?? false
  };
}

function createTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function toQrDto(member: MemberRecord): MemberQrDto {
  return {
    memberId: member.id,
    memberCode: member.memberCode,
    qrPayload: `gym-member:v1:${member.qrSecret}`
  };
}

function calculateBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg) {
    return null;
  }

  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

function toIsoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
