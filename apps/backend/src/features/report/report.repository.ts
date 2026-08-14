import type { PrismaClient } from "@prisma/client";

export interface CountRow {
  label: string;
  count: number;
}

export interface MoneyRow {
  label: string;
  amountCents: number;
}

export interface TrainerPerformanceRecord {
  staffProfileId: string;
  userId: string;
  workoutPlans: number;
  dietPlans: number;
  leaveRequests: number;
}

export interface GrowthRetentionRecord {
  month: string;
  joined: number;
}

export interface ReportRepository {
  membershipStatusCounts(): Promise<CountRow[]>;
  invoiceStatusTotals(): Promise<MoneyRow[]>;
  trainerPerformance(): Promise<TrainerPerformanceRecord[]>;
  memberGrowthByMonth(startInclusive: Date, endExclusive: Date): Promise<GrowthRetentionRecord[]>;
}

export class PrismaReportRepository implements ReportRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async membershipStatusCounts(): Promise<CountRow[]> {
    const rows = await this.prisma.membershipSubscription.groupBy({
      by: ["status"],
      _count: { _all: true }
    });
    return rows.map((row) => ({ label: row.status, count: row._count._all }));
  }

  public async invoiceStatusTotals(): Promise<MoneyRow[]> {
    const rows = await this.prisma.invoice.groupBy({
      by: ["status"],
      _sum: { amountDueCents: true }
    });
    return rows.map((row) => ({ label: row.status, amountCents: row._sum.amountDueCents ?? 0 }));
  }

  public async trainerPerformance(): Promise<TrainerPerformanceRecord[]> {
    const rows = await this.prisma.staffProfile.findMany({
      where: { role: "TRAINER", isActive: true },
      select: {
        id: true,
        userId: true,
        _count: {
          select: {
            workoutPlans: true,
            dietPlans: true,
            leaveRequests: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => ({
      staffProfileId: row.id,
      userId: row.userId,
      workoutPlans: row._count.workoutPlans,
      dietPlans: row._count.dietPlans,
      leaveRequests: row._count.leaveRequests
    }));
  }

  public async memberGrowthByMonth(startInclusive: Date, endExclusive: Date): Promise<GrowthRetentionRecord[]> {
    const rows = await this.prisma.$queryRaw<{ month: Date; joined: bigint }[]>`
      SELECT date_trunc('month', "joinedAt")::date AS month, COUNT(*)::bigint AS joined
      FROM "Member"
      WHERE "joinedAt" >= ${startInclusive} AND "joinedAt" < ${endExclusive}
      GROUP BY month
      ORDER BY month ASC
    `;
    return rows.map((row) => ({ month: row.month.toISOString().slice(0, 7), joined: Number(row.joined) }));
  }
}
