import type { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { MemberStatus, RoleName } from "@gym/shared";
import type { AuthUserRecord } from "./auth.repository.js";

export class MemberEmailRequiredError extends Error {
  public constructor() {
    super("Member email is required to create a login");
  }
}

export class MemberLoginAlreadyActiveError extends Error {
  public constructor() {
    super("Member login is already active");
  }
}

export class MemberLoginEmailConflictError extends Error {
  public constructor() {
    super("A user with this member email already exists");
  }
}

export class LinkedUserNotMemberError extends Error {
  public constructor() {
    super("Linked user is not a MEMBER user");
  }
}

export interface MemberRecord {
  id: string;
  memberCode: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalNotes: string | null;
  heightCm: number | null;
  weightKg: number | null;
  status: MemberStatus;
  joinedAt: Date;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  qrSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberLoginSetupRecord {
  member: MemberRecord;
  user: AuthUserRecord;
  regenerated: boolean;
}

export interface MemberListParams {
  page: number;
  pageSize: number;
  status?: MemberStatus;
  search?: string;
}

export interface MemberListResult {
  members: MemberRecord[];
  total: number;
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
  qrSecret: string;
}

export interface UpdateMemberInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalNotes?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

export interface CreateMeasurementInput {
  memberId: string;
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number;
  recordedAt?: Date;
}

export interface CreateProgressPhotoInput {
  memberId: string;
  imageUrl: string;
  takenAt?: Date;
  note?: string;
}

export interface MemberRepository {
  list(params: MemberListParams): Promise<MemberListResult>;
  findById(id: string): Promise<MemberRecord | null>;
  findByUserId(userId: string): Promise<MemberRecord | null>;
  findByQrSecret(qrSecret: string): Promise<MemberRecord | null>;
  findByMemberCode(memberCode: string): Promise<MemberRecord | null>;
  searchForAttendance(query: string, limit: number): Promise<MemberRecord[]>;
  findUserRole(userId: string): Promise<RoleName | null>;
  create(input: CreateMemberInput): Promise<MemberRecord>;
  update(id: string, input: UpdateMemberInput): Promise<MemberRecord>;
  setStatus(id: string, status: MemberStatus, suspendedReason?: string | null): Promise<MemberRecord>;
  updateQrSecret(id: string, qrSecret: string): Promise<MemberRecord>;
  addMeasurement(input: CreateMeasurementInput): Promise<void>;
  addProgressPhoto(input: CreateProgressPhotoInput): Promise<void>;
  createOrRegenerateLogin(memberId: string, passwordHash: string): Promise<MemberLoginSetupRecord>;
}

export class PrismaMemberRepository implements MemberRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async list(params: MemberListParams): Promise<MemberListResult> {
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { memberCode: { contains: params.search, mode: "insensitive" as const } },
              { firstName: { contains: params.search, mode: "insensitive" as const } },
              { lastName: { contains: params.search, mode: "insensitive" as const } },
              { phone: { contains: params.search, mode: "insensitive" as const } },
              { email: { contains: params.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const [members, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        orderBy: { joinedAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize
      }),
      this.prisma.member.count({ where })
    ]);

    return {
      members: members.map(toMemberRecord),
      total
    };
  }

  public async findById(id: string): Promise<MemberRecord | null> {
    const member = await this.prisma.member.findUnique({
      where: { id }
    });
    return member ? toMemberRecord(member) : null;
  }

  public async findByUserId(userId: string): Promise<MemberRecord | null> {
    const member = await this.prisma.member.findUnique({
      where: { userId }
    });
    return member ? toMemberRecord(member) : null;
  }

  public async findByQrSecret(qrSecret: string): Promise<MemberRecord | null> {
    const member = await this.prisma.member.findUnique({
      where: { qrSecret }
    });
    return member ? toMemberRecord(member) : null;
  }

  public async findByMemberCode(memberCode: string): Promise<MemberRecord | null> {
    const member = await this.prisma.member.findUnique({
      where: { memberCode }
    });
    return member ? toMemberRecord(member) : null;
  }

  public async searchForAttendance(query: string, limit: number): Promise<MemberRecord[]> {
    const members = await this.prisma.member.findMany({
      where: {
        OR: [
          { memberCode: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } }
        ]
      },
      orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      take: limit
    });
    return members.map(toMemberRecord);
  }

  public async findUserRole(userId: string): Promise<RoleName | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });
    return user ? (user.role.name as RoleName) : null;
  }

  public async create(input: CreateMemberInput): Promise<MemberRecord> {
    const member = await this.prisma.member.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        qrSecret: input.qrSecret,
        ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
        ...(input.gender ? { gender: input.gender } : {}),
        ...(input.address ? { address: input.address } : {}),
        ...(input.emergencyContactName ? { emergencyContactName: input.emergencyContactName } : {}),
        ...(input.emergencyContactPhone ? { emergencyContactPhone: input.emergencyContactPhone } : {}),
        ...(input.medicalNotes ? { medicalNotes: input.medicalNotes } : {}),
        ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
        ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
        ...(input.joinedAt ? { joinedAt: input.joinedAt } : {})
      }
    });
    return toMemberRecord(member);
  }

  public async update(id: string, input: UpdateMemberInput): Promise<MemberRecord> {
    const member = await this.prisma.member.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName } : {}),
        ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone } : {}),
        ...(input.medicalNotes !== undefined ? { medicalNotes: input.medicalNotes } : {}),
        ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
        ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {})
      }
    });
    return toMemberRecord(member);
  }

  public async setStatus(id: string, status: MemberStatus, suspendedReason?: string | null): Promise<MemberRecord> {
    const member = await this.prisma.member.update({
      where: { id },
      data:
        status === "SUSPENDED"
          ? {
              status,
              suspendedAt: new Date(),
              suspendedReason: suspendedReason ?? null
            }
          : {
              status,
              suspendedAt: null,
              suspendedReason: null
            }
    });
    return toMemberRecord(member);
  }

  public async updateQrSecret(id: string, qrSecret: string): Promise<MemberRecord> {
    const member = await this.prisma.member.update({
      where: { id },
      data: { qrSecret }
    });
    return toMemberRecord(member);
  }

  public async addMeasurement(input: CreateMeasurementInput): Promise<void> {
    await this.prisma.memberMeasurement.create({
      data: {
        memberId: input.memberId,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        ...(input.bodyFatPercent !== undefined ? { bodyFatPercent: input.bodyFatPercent } : {}),
        ...(input.recordedAt ? { recordedAt: input.recordedAt } : {})
      }
    });
  }

  public async addProgressPhoto(input: CreateProgressPhotoInput): Promise<void> {
    await this.prisma.memberProgressPhoto.create({
      data: {
        memberId: input.memberId,
        imageUrl: input.imageUrl,
        ...(input.takenAt ? { takenAt: input.takenAt } : {}),
        ...(input.note ? { note: input.note } : {})
      }
    });
  }

  public async createOrRegenerateLogin(memberId: string, passwordHash: string): Promise<MemberLoginSetupRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const member = await transaction.member.findUnique({
          where: { id: memberId },
          include: {
            user: {
              include: {
                role: true,
                memberProfile: { select: { id: true } }
              }
            }
          }
        });

        if (!member) {
          throw new Error("MEMBER_NOT_FOUND");
        }

        if (!member.email) {
          throw new MemberEmailRequiredError();
        }

        if (member.user) {
          if (member.user.role.name !== "MEMBER") {
            throw new LinkedUserNotMemberError();
          }

          if (!member.user.mustChangePassword) {
            throw new MemberLoginAlreadyActiveError();
          }

          const user = await transaction.user.update({
            where: { id: member.user.id },
            data: {
              passwordHash,
              mustChangePassword: true,
              isActive: true
            },
            include: {
              role: true,
              memberProfile: { select: { id: true } }
            }
          });

          return {
            member: toMemberRecord(member),
            user: toAuthUserRecord(user),
            regenerated: true
          };
        }

        const user = await transaction.user.create({
          data: {
            email: member.email.toLowerCase(),
            passwordHash,
            firstName: member.firstName,
            lastName: member.lastName,
            mustChangePassword: true,
            role: {
              connect: { name: "MEMBER" }
            }
          },
          include: {
            role: true,
            memberProfile: { select: { id: true } }
          }
        });
        const updatedMember = await transaction.member.update({
          where: { id: memberId },
          data: { userId: user.id }
        });

        return {
          member: toMemberRecord(updatedMember),
          user: toAuthUserRecord({ ...user, memberProfile: { id: updatedMember.id } }),
          regenerated: false
        };
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new MemberLoginEmailConflictError();
      }
      if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
        throw error;
      }
      throw error;
    }
  }
}

function toMemberRecord(member: {
  id: string;
  memberCode: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalNotes: string | null;
  heightCm: unknown;
  weightKg: unknown;
  status: string;
  joinedAt: Date;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  qrSecret: string;
  createdAt: Date;
  updatedAt: Date;
}): MemberRecord {
  return {
    id: member.id,
    memberCode: member.memberCode,
    userId: member.userId,
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    email: member.email,
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    address: member.address,
    emergencyContactName: member.emergencyContactName,
    emergencyContactPhone: member.emergencyContactPhone,
    medicalNotes: member.medicalNotes,
    heightCm: decimalToNumber(member.heightCm),
    weightKg: decimalToNumber(member.weightKg),
    status: member.status as MemberStatus,
    joinedAt: member.joinedAt,
    suspendedAt: member.suspendedAt,
    suspendedReason: member.suspendedReason,
    qrSecret: member.qrSecret,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt
  };
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toAuthUserRecord(user: {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  memberProfile?: { id: string } | null;
  role: { name: string };
  twoFactorEnabled: boolean;
  passkeys?: { id: string }[];
  securityDisableRequested: boolean;
}): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash ?? "",
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    role: user.role.name as RoleName,
    mustChangePassword: user.mustChangePassword,
    memberId: user.memberProfile?.id ?? null,
    twoFactorEnabled: user.twoFactorEnabled,
    hasPasskeys: (user.passkeys?.length ?? 0) > 0,
    securityDisableRequested: user.securityDisableRequested
  };
}
