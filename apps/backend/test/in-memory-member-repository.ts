import type { MemberStatus, RoleName } from "@gym/shared";
import type { AuthUserRecord } from "../src/repositories/auth.repository.js";
import {
  LinkedUserNotMemberError,
  MemberEmailRequiredError,
  MemberLoginAlreadyActiveError,
  MemberLoginEmailConflictError
} from "../src/repositories/member.repository.js";
import type {
  CreateMeasurementInput,
  CreateMemberInput,
  CreateProgressPhotoInput,
  MemberListParams,
  MemberListResult,
  MemberLoginSetupRecord,
  MemberRecord,
  MemberRepository,
  UpdateMemberInput
} from "../src/repositories/member.repository.js";

export class InMemoryMemberRepository implements MemberRepository {
  public readonly members = new Map<string, MemberRecord>();
  public readonly measurements: CreateMeasurementInput[] = [];
  public readonly progressPhotos: CreateProgressPhotoInput[] = [];
  public readonly userRoles = new Map<string, RoleName>();
  public readonly loginUsers = new Map<string, AuthUserRecord>();

  private sequence = 0;
  private memberCodeSequence = 0;

  public async list(params: MemberListParams): Promise<MemberListResult> {
    const search = params.search?.toLowerCase();
    const filtered = [...this.members.values()].filter((member) => {
      const matchesStatus = params.status ? member.status === params.status : true;
      const matchesSearch = search
        ? [
            member.memberCode,
            member.firstName,
            member.lastName,
            member.phone,
            member.email ?? ""
          ].some((value) => value.toLowerCase().includes(search))
        : true;
      return matchesStatus && matchesSearch;
    });

    const start = (params.page - 1) * params.pageSize;
    return {
      members: filtered.slice(start, start + params.pageSize),
      total: filtered.length
    };
  }

  public async findById(id: string): Promise<MemberRecord | null> {
    return this.members.get(id) ?? null;
  }

  public async findByUserId(userId: string): Promise<MemberRecord | null> {
    return [...this.members.values()].find((member) => member.userId === userId) ?? null;
  }

  public async findByQrSecret(qrSecret: string): Promise<MemberRecord | null> {
    return [...this.members.values()].find((member) => member.qrSecret === qrSecret) ?? null;
  }

  public async findByMemberCode(memberCode: string): Promise<MemberRecord | null> {
    return [...this.members.values()].find((member) => member.memberCode === memberCode) ?? null;
  }

  public async searchForAttendance(query: string, limit: number): Promise<MemberRecord[]> {
    const normalizedQuery = query.toLowerCase();
    return [...this.members.values()]
      .filter((member) =>
        [
          member.memberCode,
          member.firstName,
          member.lastName,
          member.phone,
          member.email ?? ""
        ].some((value) => value.toLowerCase().includes(normalizedQuery))
      )
      .slice(0, limit);
  }

  public async findUserRole(userId: string): Promise<RoleName | null> {
    return this.loginUsers.get(userId)?.role ?? this.userRoles.get(userId) ?? null;
  }

  public async create(input: CreateMemberInput): Promise<MemberRecord> {
    const now = new Date();
    const member: MemberRecord = {
      id: this.nextId("member"),
      memberCode: this.nextMemberCode(),
      userId: input.userId ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      address: input.address ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      medicalNotes: input.medicalNotes ?? null,
      heightCm: input.heightCm ?? null,
      weightKg: input.weightKg ?? null,
      status: "ACTIVE",
      joinedAt: input.joinedAt ?? now,
      suspendedAt: null,
      suspendedReason: null,
      qrSecret: input.qrSecret,
      createdAt: now,
      updatedAt: now
    };
    this.members.set(member.id, member);
    return member;
  }

  public async update(id: string, input: UpdateMemberInput): Promise<MemberRecord> {
    const member = this.requireMember(id);
    const updated: MemberRecord = {
      ...member,
      ...input,
      updatedAt: new Date()
    };
    this.members.set(id, updated);
    return updated;
  }

  public async setStatus(id: string, status: MemberStatus, suspendedReason?: string | null): Promise<MemberRecord> {
    const member = this.requireMember(id);
    const updated: MemberRecord = {
      ...member,
      status,
      suspendedAt: status === "SUSPENDED" ? new Date() : null,
      suspendedReason: status === "SUSPENDED" ? suspendedReason ?? null : null,
      updatedAt: new Date()
    };
    this.members.set(id, updated);
    return updated;
  }

  public async updateQrSecret(id: string, qrSecret: string): Promise<MemberRecord> {
    const member = this.requireMember(id);
    const updated: MemberRecord = {
      ...member,
      qrSecret,
      updatedAt: new Date()
    };
    this.members.set(id, updated);
    return updated;
  }

  public async addMeasurement(input: CreateMeasurementInput): Promise<void> {
    this.measurements.push(input);
  }

  public async addProgressPhoto(input: CreateProgressPhotoInput): Promise<void> {
    this.progressPhotos.push(input);
  }

  public async createOrRegenerateLogin(memberId: string, passwordHash: string): Promise<MemberLoginSetupRecord> {
    const member = this.requireMember(memberId);

    if (!member.email) {
      throw new MemberEmailRequiredError();
    }

    if (member.userId) {
      const existingUser = this.loginUsers.get(member.userId);
      if (!existingUser || existingUser.role !== "MEMBER") {
        throw new LinkedUserNotMemberError();
      }
      if (!existingUser.mustChangePassword) {
        throw new MemberLoginAlreadyActiveError();
      }
      const updatedUser: AuthUserRecord = {
        ...existingUser,
        passwordHash,
        isActive: true,
        mustChangePassword: true
      };
      this.loginUsers.set(updatedUser.id, updatedUser);
      return { member, user: updatedUser, regenerated: true };
    }

    const email = member.email.toLowerCase();
    if ([...this.loginUsers.values()].some((user) => user.email === email)) {
      throw new MemberLoginEmailConflictError();
    }

    const user: AuthUserRecord = {
      id: this.nextId("member-login-user"),
      email,
      passwordHash,
      firstName: member.firstName,
      lastName: member.lastName,
      role: "MEMBER",
      isActive: true,
      mustChangePassword: true,
      memberId
    };
    const updatedMember: MemberRecord = {
      ...member,
      userId: user.id,
      updatedAt: new Date()
    };
    this.members.set(memberId, updatedMember);
    this.loginUsers.set(user.id, user);
    this.userRoles.set(user.id, "MEMBER");
    return { member: updatedMember, user, regenerated: false };
  }

  private requireMember(id: string): MemberRecord {
    const member = this.members.get(id);
    if (!member) {
      throw new Error("Member not found");
    }
    return member;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  private nextMemberCode(): string {
    this.memberCodeSequence += 1;
    return `GYM-${this.memberCodeSequence.toString().padStart(6, "0")}`;
  }
}
