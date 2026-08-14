import type {
  DietMealDto,
  DietPlanTemplateDto,
  LeaveRequestDto,
  MemberDietPlanDto,
  MemberWorkoutPlanDto,
  PaginatedStaffAttendanceDto,
  RoleName,
  StaffAttendanceDto,
  StaffProfileDto,
  StaffProfileRole,
  WorkoutExerciseDto,
  WorkoutPlanTemplateDto
} from "@gym/shared";
import crypto from "node:crypto";
import { AppError, errors } from "../../core/errors/app-error.js";
import { hashPassword } from "../../core/utils/password.js";
import type { AuthRepository } from "../../features/auth/auth.repository.js";
import type { MemberRepository } from "../../features/member/member.repository.js";
import {
  DuplicateOpenStaffAttendanceError,
  type DietPlanTemplateRecord,
  type LeaveRequestRecord,
  type MemberDietPlanRecord,
  type MemberWorkoutPlanRecord,
  type StaffAttendanceRecord,
  type StaffProfileRecord,
  type StaffRepository,
  type WorkoutPlanTemplateRecord
} from "./staff.repository.js";
import type { AuditWriter } from "../../features/member/member.service.js";
import type { RequestActor, RequestContext } from "../../core/types/auth.js";
import { invalidateDashboardAndReports, type CacheService } from "../../core/cache/cache.service.js";

export class StaffService {
  public constructor(
    private readonly staffRepository: StaffRepository,
    private readonly memberRepository: MemberRepository,
    private readonly authRepository: AuthRepository,
    private readonly auditWriter: AuditWriter,
    private readonly clock: () => Date = () => new Date(),
    private readonly dashboardReportCache?: CacheService
  ) {}

  public async createProfile(
    input: { userId: string; role: StaffProfileRole; salaryCents: number },
    actor: RequestActor,
    context: RequestContext
  ): Promise<StaffProfileDto> {
    ensureAdminOrAbove(actor.role);
    const user = await this.authRepository.findUserById(input.userId);
    if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
      throw errors.badRequest("Staff profile user must have ADMIN or STAFF role");
    }
    const profile = await this.staffRepository.createProfile(input);
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "STAFF_PROFILE_CREATED", entity: "StaffProfile", entityId: profile.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toStaffProfileDto(profile, true);
  }

  public async listProfiles(actor: RequestActor): Promise<{ data: StaffProfileDto[] }> {
    ensureStaffOrAbove(actor.role);
    const includeSalary = canReadSalary(actor.role);
    const profiles = await this.staffRepository.listProfiles();
    return { data: profiles.map((profile) => toStaffProfileDto(profile, includeSalary)) };
  }

  public async updateProfile(
    id: string,
    input: { role?: StaffProfileRole | undefined; salaryCents?: number | undefined; isActive?: boolean | undefined },
    actor: RequestActor,
    context: RequestContext
  ): Promise<StaffProfileDto> {
    ensureAdminOrAbove(actor.role);
    const profile = await this.staffRepository.updateProfile(id, input);
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "STAFF_PROFILE_UPDATED", entity: "StaffProfile", entityId: profile.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toStaffProfileDto(profile, true);
  }

  public async createOrRegenerateLogin(staffProfileId: string, actor: RequestActor, context: RequestContext): Promise<{ temporaryPassword: string; user: { id: string; email: string; firstName: string; lastName: string } }> {
    ensureAdminOrAbove(actor.role);
    const profile = await this.staffRepository.findProfileById(staffProfileId);
    if (!profile) {
      throw errors.notFound("Staff profile not found");
    }
    const user = await this.authRepository.findUserById(profile.userId);
    if (!user) {
      throw errors.notFound("Associated user not found");
    }

    const temporaryPassword = createTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    
    // Update the password and require the user to change it on next login
    await this.authRepository.updatePassword(user.id, passwordHash, true);
    
    await this.auditWriter.writeAuditLog({ 
      userId: actor.id, 
      action: "STAFF_LOGIN_REGENERATED", 
      entity: "StaffProfile", 
      entityId: profile.id, 
      ...context 
    });
    
    return { 
      temporaryPassword,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };
  }

  public async checkIn(staffProfileId: string, actor: RequestActor, context: RequestContext): Promise<StaffAttendanceDto> {
    await this.ensureCanManageStaffAttendance(staffProfileId, actor);
    try {
      const attendance = await this.staffRepository.createOpenAttendance({ staffProfileId, checkInAt: this.clock() });
      await Promise.all([
      this.auditWriter.writeAuditLog({
        userId: actor.id,
        action: "STAFF_ATTENDANCE_CHECKED_IN",
        entity: "StaffAttendance",
        entityId: attendance.id,
        ...context
      }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
      return toStaffAttendanceDto(attendance);
    } catch (error: unknown) {
      if (error instanceof DuplicateOpenStaffAttendanceError) {
        throw new AppError(409, "STAFF_ALREADY_CHECKED_IN", "Staff member already has an open attendance session");
      }
      throw error;
    }
  }

  public async checkOut(staffProfileId: string, actor: RequestActor, context: RequestContext): Promise<StaffAttendanceDto> {
    await this.ensureCanManageStaffAttendance(staffProfileId, actor);
    const attendance = await this.staffRepository.findOpenAttendance(staffProfileId);
    if (!attendance) {
      throw new AppError(404, "OPEN_STAFF_ATTENDANCE_NOT_FOUND", "No open staff attendance found");
    }
    const checkOutAt = this.clock();
    const durationMinutes = Math.max(0, Math.round((checkOutAt.getTime() - attendance.checkInAt.getTime()) / 60000));
    const closed = await this.staffRepository.closeAttendance({ id: attendance.id, checkOutAt, durationMinutes });
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "STAFF_ATTENDANCE_CHECKED_OUT",
      entity: "StaffAttendance",
      entityId: closed.id,
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toStaffAttendanceDto(closed);
  }

  public async listAttendance(
    input: { staffProfileId: string; from?: Date | undefined; to?: Date | undefined; page: number; pageSize: number },
    actor: RequestActor
  ): Promise<PaginatedStaffAttendanceDto> {
    await this.ensureCanManageStaffAttendance(input.staffProfileId, actor);
    const result = await this.staffRepository.listAttendance(input);
    return {
      data: result.attendances.map(toStaffAttendanceDto),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize)
      }
    };
  }

  public async createLeaveRequest(
    input: { staffProfileId: string; startDate: Date; endDate: Date; reason: string },
    actor: RequestActor,
    context: RequestContext
  ): Promise<LeaveRequestDto> {
    await this.ensureCanManageOwnStaffRecord(input.staffProfileId, actor);
    const request = await this.staffRepository.createLeaveRequest(input);
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "LEAVE_REQUEST_CREATED", entity: "LeaveRequest", entityId: request.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toLeaveRequestDto(request);
  }

  public async reviewLeaveRequest(
    id: string,
    status: "APPROVED" | "REJECTED",
    actor: RequestActor,
    context: RequestContext
  ): Promise<LeaveRequestDto> {
    ensureAdminOrAbove(actor.role);
    const request = await this.staffRepository.reviewLeaveRequest({ id, status, reviewedBy: actor.id, reviewedAt: this.clock() });
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "LEAVE_REQUEST_REVIEWED", entity: "LeaveRequest", entityId: request.id, metadata: { status }, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toLeaveRequestDto(request);
  }

  public async listLeaveRequests(actor: RequestActor, staffProfileId?: string): Promise<{ data: LeaveRequestDto[] }> {
    if (staffProfileId) {
      await this.ensureCanManageOwnStaffRecord(staffProfileId, actor);
    } else {
      ensureAdminOrAbove(actor.role);
    }
    const requests = await this.staffRepository.listLeaveRequests(staffProfileId);
    return { data: requests.map(toLeaveRequestDto) };
  }

  public async createWorkoutTemplate(
    input: { name: string; exercises: WorkoutExerciseDto[] },
    actor: RequestActor,
    context: RequestContext
  ): Promise<WorkoutPlanTemplateDto> {
    ensureTrainerOrAdmin(actor.role);
    const template = await this.staffRepository.createWorkoutTemplate(input);
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "WORKOUT_TEMPLATE_CREATED", entity: "WorkoutPlanTemplate", entityId: template.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toWorkoutTemplateDto(template);
  }

  public async listWorkoutTemplates(actor: RequestActor): Promise<{ data: WorkoutPlanTemplateDto[] }> {
    ensureStaffOrAbove(actor.role);
    const templates = await this.staffRepository.listWorkoutTemplates();
    return { data: templates.map(toWorkoutTemplateDto) };
  }

  public async updateWorkoutTemplate(
    id: string,
    input: { name?: string | undefined; exercises?: WorkoutExerciseDto[] | undefined; isActive?: boolean | undefined },
    actor: RequestActor,
    context: RequestContext
  ): Promise<WorkoutPlanTemplateDto> {
    ensureTrainerOrAdmin(actor.role);
    const template = await this.staffRepository.updateWorkoutTemplate(id, input);
    if (!template) {
      throw errors.notFound("Workout template not found");
    }
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "WORKOUT_TEMPLATE_UPDATED", entity: "WorkoutPlanTemplate", entityId: template.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toWorkoutTemplateDto(template);
  }

  public async assignWorkoutPlan(
    input: { memberId: string; templateId: string; trainerId?: string | undefined; startDate: Date },
    actor: RequestActor,
    context: RequestContext
  ): Promise<MemberWorkoutPlanDto> {
    const trainerId = await this.resolveTrainerId(input.trainerId, actor);
    await this.ensureMemberExists(input.memberId);
    const plan = await this.staffRepository.assignWorkoutPlan({ ...input, trainerId });
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "WORKOUT_PLAN_ASSIGNED", entity: "MemberWorkoutPlan", entityId: plan.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toMemberWorkoutPlanDto(plan);
  }

  public async listWorkoutPlans(memberId: string, actor: RequestActor): Promise<{ data: MemberWorkoutPlanDto[] }> {
    ensureStaffOrMemberSelf(actor.role);
    await this.ensureMemberExists(memberId);
    const plans = await this.staffRepository.listWorkoutPlansForMember(memberId);
    return { data: plans.map(toMemberWorkoutPlanDto) };
  }

  public async createDietTemplate(input: { name: string; meals: DietMealDto[] }, actor: RequestActor, context: RequestContext): Promise<DietPlanTemplateDto> {
    ensureTrainerOrAdmin(actor.role);
    const template = await this.staffRepository.createDietTemplate(input);
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "DIET_TEMPLATE_CREATED", entity: "DietPlanTemplate", entityId: template.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toDietTemplateDto(template);
  }

  public async updateDietTemplate(
    id: string,
    input: { name?: string | undefined; meals?: DietMealDto[] | undefined; isActive?: boolean | undefined },
    actor: RequestActor,
    context: RequestContext
  ): Promise<DietPlanTemplateDto> {
    ensureTrainerOrAdmin(actor.role);
    const template = await this.staffRepository.updateDietTemplate(id, input);
    if (!template) {
      throw errors.notFound("Diet template not found");
    }
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "DIET_TEMPLATE_UPDATED", entity: "DietPlanTemplate", entityId: template.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toDietTemplateDto(template);
  }

  public async listDietTemplates(actor: RequestActor): Promise<{ data: DietPlanTemplateDto[] }> {
    ensureStaffOrAbove(actor.role);
    const templates = await this.staffRepository.listDietTemplates();
    return { data: templates.map(toDietTemplateDto) };
  }

  public async assignDietPlan(
    input: { memberId: string; templateId: string; trainerId?: string | undefined; startDate: Date },
    actor: RequestActor,
    context: RequestContext
  ): Promise<MemberDietPlanDto> {
    const trainerId = await this.resolveTrainerId(input.trainerId, actor);
    await this.ensureMemberExists(input.memberId);
    const plan = await this.staffRepository.assignDietPlan({ ...input, trainerId });
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "DIET_PLAN_ASSIGNED", entity: "MemberDietPlan", entityId: plan.id, ...context }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toMemberDietPlanDto(plan);
  }

  public async listDietPlans(memberId: string, actor: RequestActor): Promise<{ data: MemberDietPlanDto[] }> {
    ensureStaffOrMemberSelf(actor.role);
    await this.ensureMemberExists(memberId);
    const plans = await this.staffRepository.listDietPlansForMember(memberId);
    return { data: plans.map(toMemberDietPlanDto) };
  }

  private async resolveTrainerId(requestedTrainerId: string | undefined, actor: RequestActor): Promise<string | undefined> {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GYM_OWNER" || actor.role === "ADMIN") {
      return requestedTrainerId;
    }
    const profile = await this.staffRepository.findProfileByUserId(actor.id);
    if (!profile || profile.role !== "TRAINER") {
      throw errors.forbidden();
    }
    if (requestedTrainerId && requestedTrainerId !== profile.id) {
      throw errors.forbidden();
    }
    return profile.id;
  }

  private async ensureCanManageStaffAttendance(staffProfileId: string, actor: RequestActor): Promise<void> {
    if (actor.role === "SUPER_ADMIN" || actor.role === "GYM_OWNER" || actor.role === "ADMIN") {
      return;
    }
    await this.ensureCanManageOwnStaffRecord(staffProfileId, actor);
  }

  private async ensureCanManageOwnStaffRecord(staffProfileId: string, actor: RequestActor): Promise<void> {
    const profile = await this.staffRepository.findProfileById(staffProfileId);
    if (!profile) {
      throw errors.notFound("Staff profile not found");
    }
    if (profile.userId !== actor.id) {
      throw errors.forbidden();
    }
  }

  private async ensureMemberExists(memberId: string): Promise<void> {
    const member = await this.memberRepository.findById(memberId);
    if (!member) {
      throw errors.notFound("Member not found");
    }
  }
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }
  throw errors.forbidden();
}

function ensureStaffOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF") {
    return;
  }
  throw errors.forbidden();
}

function ensureTrainerOrAdmin(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF") {
    return;
  }
  throw errors.forbidden();
}

function ensureStaffOrMemberSelf(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF" || role === "MEMBER") {
    return;
  }
  throw errors.forbidden();
}

function canReadSalary(role: RoleName): boolean {
  return role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN";
}

function toStaffProfileDto(profile: StaffProfileRecord, includeSalary: boolean): StaffProfileDto {
  return {
    id: profile.id,
    userId: profile.userId,
    role: profile.role,
    ...(includeSalary ? { salaryCents: profile.salaryCents } : {}),
    isActive: profile.isActive,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

function toStaffAttendanceDto(attendance: StaffAttendanceRecord): StaffAttendanceDto {
  return {
    id: attendance.id,
    staffProfileId: attendance.staffProfileId,
    checkInAt: attendance.checkInAt.toISOString(),
    checkOutAt: attendance.checkOutAt?.toISOString() ?? null,
    durationMinutes: attendance.durationMinutes,
    status: attendance.status
  };
}

function toLeaveRequestDto(request: LeaveRequestRecord): LeaveRequestDto {
  return {
    id: request.id,
    staffProfileId: request.staffProfileId,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    reason: request.reason,
    status: request.status,
    reviewedBy: request.reviewedBy,
    reviewedAt: request.reviewedAt?.toISOString() ?? null
  };
}

function toWorkoutTemplateDto(template: WorkoutPlanTemplateRecord): WorkoutPlanTemplateDto {
  return template;
}

function toMemberWorkoutPlanDto(plan: MemberWorkoutPlanRecord): MemberWorkoutPlanDto {
  return { ...plan, startDate: plan.startDate.toISOString() };
}

function toDietTemplateDto(template: DietPlanTemplateRecord): DietPlanTemplateDto {
  return template;
}

function toMemberDietPlanDto(plan: MemberDietPlanRecord): MemberDietPlanDto {
  return { ...plan, startDate: plan.startDate.toISOString() };
}

function createTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

