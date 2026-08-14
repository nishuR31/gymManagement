import type { CheckInMethod } from "@gym/shared";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { PrismaClient } from "@prisma/client";

export class DuplicateOpenAttendanceError extends Error {
  public constructor() {
    super("Member already has an open attendance session");
  }
}

export interface AttendanceMemberSummaryRecord {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  imageUrl: string | null;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  checkInAt: Date;
  checkOutAt: Date | null;
  checkInMethod: CheckInMethod;
  checkedInBy: string | null;
  durationMinutes: number | null;
  autoClosed: boolean;
  member: AttendanceMemberSummaryRecord;
}

export interface CreateAttendanceInput {
  memberId: string;
  checkInAt: Date;
  checkInMethod: CheckInMethod;
  checkedInBy: string;
}

export interface CloseAttendanceInput {
  id: string;
  checkOutAt: Date;
  durationMinutes: number;
  autoClosed: boolean;
}

export interface AttendanceRepository {
  createOpenAttendance(input: CreateAttendanceInput): Promise<AttendanceRecord>;
  findOpenByMemberId(memberId: string): Promise<AttendanceRecord | null>;
  findById(id: string): Promise<AttendanceRecord | null>;
  closeAttendance(input: CloseAttendanceInput): Promise<AttendanceRecord>;
  listCurrent(): Promise<AttendanceRecord[]>;
  countCurrent(): Promise<number>;
  countOpenForMember(memberId: string): Promise<number>;
  findOpenBefore(cutoff: Date): Promise<AttendanceRecord[]>;
  getAttendanceForDate(startInclusive: Date, endExclusive: Date): Promise<AttendanceRecord[]>;
  countAttendanceForDate(startInclusive: Date, endExclusive: Date): Promise<number>;
  listForMember(memberId: string, page: number, pageSize: number): Promise<{ attendances: AttendanceRecord[]; total: number }>;
  listHistory(page: number, pageSize: number): Promise<{ attendances: AttendanceRecord[]; total: number }>;
  countByCheckInDay(startInclusive: Date, endExclusive: Date): Promise<{ date: string; count: number }[]>;
}

export class PrismaAttendanceRepository implements AttendanceRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createOpenAttendance(input: CreateAttendanceInput): Promise<AttendanceRecord> {
    try {
      const attendance = await this.prisma.attendance.create({
        data: input,
        include: attendanceInclude
      });
      return toAttendanceRecord(attendance);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new DuplicateOpenAttendanceError();
      }
      throw error;
    }
  }

  public async findOpenByMemberId(memberId: string): Promise<AttendanceRecord | null> {
    const attendance = await this.prisma.attendance.findFirst({
      where: { memberId, checkOutAt: null },
      include: attendanceInclude
    });
    return attendance ? toAttendanceRecord(attendance) : null;
  }

  public async findById(id: string): Promise<AttendanceRecord | null> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: attendanceInclude
    });
    return attendance ? toAttendanceRecord(attendance) : null;
  }

  public async closeAttendance(input: CloseAttendanceInput): Promise<AttendanceRecord> {
    const attendance = await this.prisma.attendance.update({
      where: { id: input.id },
      data: {
        checkOutAt: input.checkOutAt,
        durationMinutes: input.durationMinutes,
        autoClosed: input.autoClosed
      },
      include: attendanceInclude
    });
    return toAttendanceRecord(attendance);
  }

  public async listCurrent(): Promise<AttendanceRecord[]> {
    const rows = await this.prisma.attendance.findMany({
      where: { checkOutAt: null },
      include: attendanceInclude,
      orderBy: { checkInAt: "asc" }
    });
    return rows.map(toAttendanceRecord);
  }

  public async countCurrent(): Promise<number> {
    return this.prisma.attendance.count({
      where: { checkOutAt: null }
    });
  }

  public async countOpenForMember(memberId: string): Promise<number> {
    return this.prisma.attendance.count({
      where: { memberId, checkOutAt: null }
    });
  }

  public async findOpenBefore(cutoff: Date): Promise<AttendanceRecord[]> {
    const rows = await this.prisma.attendance.findMany({
      where: {
        checkOutAt: null,
        checkInAt: { lt: cutoff }
      },
      include: attendanceInclude,
      orderBy: { checkInAt: "asc" }
    });
    return rows.map(toAttendanceRecord);
  }

  public async getAttendanceForDate(startInclusive: Date, endExclusive: Date): Promise<AttendanceRecord[]> {
    const rows = await this.prisma.attendance.findMany({
      where: {
        checkInAt: {
          gte: startInclusive,
          lt: endExclusive
        }
      },
      include: attendanceInclude,
      orderBy: { checkInAt: "asc" }
    });
    return rows.map(toAttendanceRecord);
  }

  public async countAttendanceForDate(startInclusive: Date, endExclusive: Date): Promise<number> {
    return this.prisma.attendance.count({
      where: {
        checkInAt: {
          gte: startInclusive,
          lt: endExclusive
        }
      }
    });
  }

  public async listForMember(
    memberId: string,
    page: number,
    pageSize: number
  ): Promise<{ attendances: AttendanceRecord[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where: { memberId },
        include: attendanceInclude,
        orderBy: { checkInAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.attendance.count({
        where: { memberId }
      })
    ]);

    return {
      attendances: rows.map(toAttendanceRecord),
      total
    };
  }

  public async listHistory(
    page: number,
    pageSize: number
  ): Promise<{ attendances: AttendanceRecord[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        include: attendanceInclude,
        orderBy: { checkInAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.attendance.count()
    ]);

    return {
      attendances: rows.map(toAttendanceRecord),
      total
    };
  }

  public async countByCheckInDay(startInclusive: Date, endExclusive: Date): Promise<{ date: string; count: number }[]> {
    const rows = await this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT date_trunc('day', "checkInAt")::date AS date, COUNT(*)::bigint AS count
      FROM "Attendance"
      WHERE "checkInAt" >= ${startInclusive} AND "checkInAt" < ${endExclusive}
      GROUP BY date
      ORDER BY date ASC
    `;

    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      count: Number(row.count)
    }));
  }
}

const attendanceInclude = {
  member: {
    include: {
      progressPhotos: {
        orderBy: { takenAt: "desc" as const },
        take: 1
      }
    }
  }
};

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2002";
}

function toAttendanceRecord(row: {
  id: string;
  memberId: string;
  checkInAt: Date;
  checkOutAt: Date | null;
  checkInMethod: string;
  checkedInBy: string | null;
  durationMinutes: number | null;
  autoClosed: boolean;
  member: {
    id: string;
    memberCode: string;
    firstName: string;
    lastName: string;
    phone: string;
    progressPhotos: { imageUrl: string }[];
  };
}): AttendanceRecord {
  return {
    id: row.id,
    memberId: row.memberId,
    checkInAt: row.checkInAt,
    checkOutAt: row.checkOutAt,
    checkInMethod: row.checkInMethod as CheckInMethod,
    checkedInBy: row.checkedInBy,
    durationMinutes: row.durationMinutes,
    autoClosed: row.autoClosed,
    member: {
      id: row.member.id,
      memberCode: row.member.memberCode,
      firstName: row.member.firstName,
      lastName: row.member.lastName,
      phone: row.member.phone,
      imageUrl: row.member.progressPhotos[0]?.imageUrl ?? null
    }
  };
}
