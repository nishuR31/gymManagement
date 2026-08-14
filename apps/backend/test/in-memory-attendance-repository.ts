import type { CheckInMethod } from "@gym/shared";
import {
  DuplicateOpenAttendanceError,
  type AttendanceMemberSummaryRecord,
  type AttendanceRecord,
  type AttendanceRepository,
  type CloseAttendanceInput,
  type CreateAttendanceInput
} from "../src/repositories/attendance.repository.js";
import type { InMemoryMemberRepository } from "./in-memory-member-repository.js";

export class InMemoryAttendanceRepository implements AttendanceRepository {
  public readonly attendances = new Map<string, AttendanceRecord>();

  private sequence = 0;

  public constructor(private readonly memberRepository: InMemoryMemberRepository) {}

  public async createOpenAttendance(input: CreateAttendanceInput): Promise<AttendanceRecord> {
    const alreadyOpen = [...this.attendances.values()].some(
      (attendance) => attendance.memberId === input.memberId && !attendance.checkOutAt
    );
    if (alreadyOpen) {
      throw new DuplicateOpenAttendanceError();
    }

    const attendance: AttendanceRecord = {
      id: this.nextId("attendance"),
      memberId: input.memberId,
      checkInAt: input.checkInAt,
      checkOutAt: null,
      checkInMethod: input.checkInMethod,
      checkedInBy: input.checkedInBy,
      durationMinutes: null,
      autoClosed: false,
      member: this.memberSummary(input.memberId)
    };
    this.attendances.set(attendance.id, attendance);
    return attendance;
  }

  public async findOpenByMemberId(memberId: string): Promise<AttendanceRecord | null> {
    return [...this.attendances.values()].find((attendance) => attendance.memberId === memberId && !attendance.checkOutAt) ?? null;
  }

  public async findById(id: string): Promise<AttendanceRecord | null> {
    return this.attendances.get(id) ?? null;
  }

  public async closeAttendance(input: CloseAttendanceInput): Promise<AttendanceRecord> {
    const attendance = this.attendances.get(input.id);
    if (!attendance) {
      throw new Error("Attendance not found");
    }

    const closed: AttendanceRecord = {
      ...attendance,
      checkOutAt: input.checkOutAt,
      durationMinutes: input.durationMinutes,
      autoClosed: input.autoClosed
    };
    this.attendances.set(closed.id, closed);
    return closed;
  }

  public async listCurrent(): Promise<AttendanceRecord[]> {
    return [...this.attendances.values()].filter((attendance) => !attendance.checkOutAt);
  }

  public async countOpenForMember(memberId: string): Promise<number> {
    return [...this.attendances.values()].filter((attendance) => attendance.memberId === memberId && !attendance.checkOutAt).length;
  }

  public async findOpenBefore(cutoff: Date): Promise<AttendanceRecord[]> {
    return [...this.attendances.values()].filter((attendance) => !attendance.checkOutAt && attendance.checkInAt < cutoff);
  }

  public async getAttendanceForDate(startInclusive: Date, endExclusive: Date): Promise<AttendanceRecord[]> {
    return [...this.attendances.values()].filter(
      (attendance) => attendance.checkInAt >= startInclusive && attendance.checkInAt < endExclusive
    );
  }

  public async listForMember(
    memberId: string,
    page: number,
    pageSize: number
  ): Promise<{ attendances: AttendanceRecord[]; total: number }> {
    const rows = [...this.attendances.values()]
      .filter((attendance) => attendance.memberId === memberId)
      .sort((left, right) => right.checkInAt.getTime() - left.checkInAt.getTime());
    const start = (page - 1) * pageSize;

    return {
      attendances: rows.slice(start, start + pageSize),
      total: rows.length
    };
  }

  public async countByCheckInDay(startInclusive: Date, endExclusive: Date): Promise<{ date: string; count: number }[]> {
    const counts = new Map<string, number>();

    for (const attendance of this.attendances.values()) {
      if (attendance.checkInAt >= startInclusive && attendance.checkInAt < endExclusive) {
        const date = attendance.checkInAt.toISOString().slice(0, 10);
        counts.set(date, (counts.get(date) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  private memberSummary(memberId: string): AttendanceMemberSummaryRecord {
    const member = this.memberRepository.members.get(memberId);

    if (!member) {
      throw new Error("Member not found");
    }

    return {
      id: member.id,
      memberCode: member.memberCode,
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone,
      imageUrl: null
    };
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}
