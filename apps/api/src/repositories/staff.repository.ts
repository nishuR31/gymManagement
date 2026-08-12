import type {
  DietMealDto,
  LeaveRequestStatus,
  StaffAttendanceStatus,
  StaffProfileRole,
  WorkoutExerciseDto
} from "@gym/shared";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Prisma, type PrismaClient } from "@prisma/client";

export class DuplicateOpenStaffAttendanceError extends Error {
  public constructor() {
    super("Staff member already has an open attendance session");
  }
}

export interface StaffProfileRecord {
  id: string;
  userId: string;
  role: StaffProfileRole;
  salaryCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffAttendanceRecord {
  id: string;
  staffProfileId: string;
  checkInAt: Date;
  checkOutAt: Date | null;
  durationMinutes: number | null;
  status: StaffAttendanceStatus;
}

export interface LeaveRequestRecord {
  id: string;
  staffProfileId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

export interface WorkoutPlanTemplateRecord {
  id: string;
  name: string;
  exercises: WorkoutExerciseDto[];
  isActive: boolean;
}

export interface MemberWorkoutPlanRecord {
  id: string;
  memberId: string;
  templateId: string;
  trainerId: string | null;
  startDate: Date;
  exercises: WorkoutExerciseDto[];
}

export interface DietPlanTemplateRecord {
  id: string;
  name: string;
  meals: DietMealDto[];
  isActive: boolean;
}

export interface MemberDietPlanRecord {
  id: string;
  memberId: string;
  templateId: string;
  trainerId: string | null;
  startDate: Date;
  meals: DietMealDto[];
}

export interface StaffRepository {
  createProfile(input: { userId: string; role: StaffProfileRole; salaryCents: number }): Promise<StaffProfileRecord>;
  updateProfile(
    id: string,
    input: { role?: StaffProfileRole | undefined; salaryCents?: number | undefined; isActive?: boolean | undefined }
  ): Promise<StaffProfileRecord>;
  listProfiles(): Promise<StaffProfileRecord[]>;
  findProfileById(id: string): Promise<StaffProfileRecord | null>;
  findProfileByUserId(userId: string): Promise<StaffProfileRecord | null>;
  createOpenAttendance(input: { staffProfileId: string; checkInAt: Date }): Promise<StaffAttendanceRecord>;
  findOpenAttendance(staffProfileId: string): Promise<StaffAttendanceRecord | null>;
  closeAttendance(input: { id: string; checkOutAt: Date; durationMinutes: number }): Promise<StaffAttendanceRecord>;
  listAttendance(input: {
    staffProfileId: string;
    from?: Date | undefined;
    to?: Date | undefined;
    page: number;
    pageSize: number;
  }): Promise<{ attendances: StaffAttendanceRecord[]; total: number }>;
  createLeaveRequest(input: { staffProfileId: string; startDate: Date; endDate: Date; reason: string }): Promise<LeaveRequestRecord>;
  reviewLeaveRequest(input: { id: string; status: Exclude<LeaveRequestStatus, "PENDING">; reviewedBy: string; reviewedAt: Date }): Promise<LeaveRequestRecord>;
  listLeaveRequests(staffProfileId?: string): Promise<LeaveRequestRecord[]>;
  createWorkoutTemplate(input: { name: string; exercises: WorkoutExerciseDto[] }): Promise<WorkoutPlanTemplateRecord>;
  updateWorkoutTemplate(id: string, input: { name?: string | undefined; exercises?: WorkoutExerciseDto[] | undefined; isActive?: boolean | undefined }): Promise<WorkoutPlanTemplateRecord | null>;
  listWorkoutTemplates(): Promise<WorkoutPlanTemplateRecord[]>;
  assignWorkoutPlan(input: { memberId: string; templateId: string; trainerId?: string | undefined; startDate: Date }): Promise<MemberWorkoutPlanRecord>;
  listWorkoutPlansForMember(memberId: string): Promise<MemberWorkoutPlanRecord[]>;
  createDietTemplate(input: { name: string; meals: DietMealDto[] }): Promise<DietPlanTemplateRecord>;
  updateDietTemplate(id: string, input: { name?: string | undefined; meals?: DietMealDto[] | undefined; isActive?: boolean | undefined }): Promise<DietPlanTemplateRecord | null>;
  listDietTemplates(): Promise<DietPlanTemplateRecord[]>;
  assignDietPlan(input: { memberId: string; templateId: string; trainerId?: string | undefined; startDate: Date }): Promise<MemberDietPlanRecord>;
  listDietPlansForMember(memberId: string): Promise<MemberDietPlanRecord[]>;
}

export class PrismaStaffRepository implements StaffRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createProfile(input: { userId: string; role: StaffProfileRole; salaryCents: number }): Promise<StaffProfileRecord> {
    return this.prisma.staffProfile.create({ data: input });
  }

  public async updateProfile(
    id: string,
    input: { role?: StaffProfileRole | undefined; salaryCents?: number | undefined; isActive?: boolean | undefined }
  ): Promise<StaffProfileRecord> {
    return this.prisma.staffProfile.update({
      where: { id },
      data: {
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.salaryCents !== undefined ? { salaryCents: input.salaryCents } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      }
    });
  }

  public async listProfiles(): Promise<StaffProfileRecord[]> {
    return this.prisma.staffProfile.findMany({ orderBy: { createdAt: "desc" } });
  }

  public async findProfileById(id: string): Promise<StaffProfileRecord | null> {
    return this.prisma.staffProfile.findUnique({ where: { id } });
  }

  public async findProfileByUserId(userId: string): Promise<StaffProfileRecord | null> {
    return this.prisma.staffProfile.findUnique({ where: { userId } });
  }

  public async createOpenAttendance(input: { staffProfileId: string; checkInAt: Date }): Promise<StaffAttendanceRecord> {
    try {
      return await this.prisma.staffAttendance.create({
        data: {
          staffProfileId: input.staffProfileId,
          checkInAt: input.checkInAt,
          status: "OPEN"
        }
      });
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new DuplicateOpenStaffAttendanceError();
      }
      throw error;
    }
  }

  public async findOpenAttendance(staffProfileId: string): Promise<StaffAttendanceRecord | null> {
    return this.prisma.staffAttendance.findFirst({ where: { staffProfileId, status: "OPEN" } });
  }

  public async closeAttendance(input: { id: string; checkOutAt: Date; durationMinutes: number }): Promise<StaffAttendanceRecord> {
    return this.prisma.staffAttendance.update({
      where: { id: input.id },
      data: { checkOutAt: input.checkOutAt, durationMinutes: input.durationMinutes, status: "CLOSED" }
    });
  }

  public async listAttendance(input: {
    staffProfileId: string;
    from?: Date | undefined;
    to?: Date | undefined;
    page: number;
    pageSize: number;
  }): Promise<{ attendances: StaffAttendanceRecord[]; total: number }> {
    const where = {
      staffProfileId: input.staffProfileId,
      ...(input.from || input.to
        ? {
            checkInAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lt: input.to } : {})
            }
          }
        : {})
    };
    const [attendances, total] = await this.prisma.$transaction([
      this.prisma.staffAttendance.findMany({
        where,
        orderBy: { checkInAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      this.prisma.staffAttendance.count({ where })
    ]);
    return { attendances, total };
  }

  public async createLeaveRequest(input: { staffProfileId: string; startDate: Date; endDate: Date; reason: string }): Promise<LeaveRequestRecord> {
    return this.prisma.leaveRequest.create({ data: input });
  }

  public async reviewLeaveRequest(input: {
    id: string;
    status: Exclude<LeaveRequestStatus, "PENDING">;
    reviewedBy: string;
    reviewedAt: Date;
  }): Promise<LeaveRequestRecord> {
    return this.prisma.leaveRequest.update({
      where: { id: input.id },
      data: { status: input.status, reviewedBy: input.reviewedBy, reviewedAt: input.reviewedAt }
    });
  }

  public async listLeaveRequests(staffProfileId?: string): Promise<LeaveRequestRecord[]> {
    return this.prisma.leaveRequest.findMany({
      where: staffProfileId ? { staffProfileId } : {},
      orderBy: { createdAt: "desc" }
    });
  }

  public async createWorkoutTemplate(input: { name: string; exercises: WorkoutExerciseDto[] }): Promise<WorkoutPlanTemplateRecord> {
    const template = await this.prisma.workoutPlanTemplate.create({
      data: { name: input.name, exercises: input.exercises as unknown as Prisma.InputJsonValue }
    });
    return toWorkoutTemplateRecord(template);
  }

  public async updateWorkoutTemplate(
    id: string,
    input: { name?: string | undefined; exercises?: WorkoutExerciseDto[] | undefined; isActive?: boolean | undefined }
  ): Promise<WorkoutPlanTemplateRecord | null> {
    const template = await this.prisma.workoutPlanTemplate
      .update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.exercises !== undefined ? { exercises: input.exercises as unknown as Prisma.InputJsonValue } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
        }
      })
      .catch(() => null);
    return template ? toWorkoutTemplateRecord(template) : null;
  }

  public async listWorkoutTemplates(): Promise<WorkoutPlanTemplateRecord[]> {
    const rows = await this.prisma.workoutPlanTemplate.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return rows.map(toWorkoutTemplateRecord);
  }

  public async assignWorkoutPlan(input: {
    memberId: string;
    templateId: string;
    trainerId?: string | undefined;
    startDate: Date;
  }): Promise<MemberWorkoutPlanRecord> {
    const template = await this.prisma.workoutPlanTemplate.findUniqueOrThrow({ where: { id: input.templateId } });
    const plan = await this.prisma.memberWorkoutPlan.create({
      data: {
        memberId: input.memberId,
        templateId: input.templateId,
        ...(input.trainerId ? { trainerId: input.trainerId } : {}),
        startDate: input.startDate,
        exercises: template.exercises as Prisma.InputJsonValue
      }
    });
    return toMemberWorkoutPlanRecord(plan);
  }

  public async listWorkoutPlansForMember(memberId: string): Promise<MemberWorkoutPlanRecord[]> {
    const rows = await this.prisma.memberWorkoutPlan.findMany({ where: { memberId }, orderBy: { startDate: "desc" } });
    return rows.map(toMemberWorkoutPlanRecord);
  }

  public async createDietTemplate(input: { name: string; meals: DietMealDto[] }): Promise<DietPlanTemplateRecord> {
    const template = await this.prisma.dietPlanTemplate.create({
      data: { name: input.name, meals: input.meals as unknown as Prisma.InputJsonValue }
    });
    return toDietTemplateRecord(template);
  }

  public async updateDietTemplate(
    id: string,
    input: { name?: string | undefined; meals?: DietMealDto[] | undefined; isActive?: boolean | undefined }
  ): Promise<DietPlanTemplateRecord | null> {
    const template = await this.prisma.dietPlanTemplate
      .update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.meals !== undefined ? { meals: input.meals as unknown as Prisma.InputJsonValue } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
        }
      })
      .catch(() => null);
    return template ? toDietTemplateRecord(template) : null;
  }

  public async listDietTemplates(): Promise<DietPlanTemplateRecord[]> {
    const rows = await this.prisma.dietPlanTemplate.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return rows.map(toDietTemplateRecord);
  }

  public async assignDietPlan(input: { memberId: string; templateId: string; trainerId?: string | undefined; startDate: Date }): Promise<MemberDietPlanRecord> {
    const template = await this.prisma.dietPlanTemplate.findUniqueOrThrow({ where: { id: input.templateId } });
    const plan = await this.prisma.memberDietPlan.create({
      data: {
        memberId: input.memberId,
        templateId: input.templateId,
        ...(input.trainerId ? { trainerId: input.trainerId } : {}),
        startDate: input.startDate,
        meals: template.meals as Prisma.InputJsonValue
      }
    });
    return toMemberDietPlanRecord(plan);
  }

  public async listDietPlansForMember(memberId: string): Promise<MemberDietPlanRecord[]> {
    const rows = await this.prisma.memberDietPlan.findMany({ where: { memberId }, orderBy: { startDate: "desc" } });
    return rows.map(toMemberDietPlanRecord);
  }
}

function toWorkoutTemplateRecord(row: { id: string; name: string; exercises: unknown; isActive: boolean }): WorkoutPlanTemplateRecord {
  return { ...row, exercises: row.exercises as WorkoutExerciseDto[] };
}

function toMemberWorkoutPlanRecord(row: {
  id: string;
  memberId: string;
  templateId: string;
  trainerId: string | null;
  startDate: Date;
  exercises: unknown;
}): MemberWorkoutPlanRecord {
  return { ...row, exercises: row.exercises as WorkoutExerciseDto[] };
}

function toDietTemplateRecord(row: { id: string; name: string; meals: unknown; isActive: boolean }): DietPlanTemplateRecord {
  return { ...row, meals: row.meals as DietMealDto[] };
}

function toMemberDietPlanRecord(row: {
  id: string;
  memberId: string;
  templateId: string;
  trainerId: string | null;
  startDate: Date;
  meals: unknown;
}): MemberDietPlanRecord {
  return { ...row, meals: row.meals as DietMealDto[] };
}
