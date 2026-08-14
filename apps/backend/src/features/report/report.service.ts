import type { PaymentAnalyticsRange, ReportDto, RoleName } from "@gym/shared";
import { errors } from "../../core/errors/app-error.js";
import type { AttendanceRepository } from "../../features/attendance/attendance.repository.js";
import type { InventoryRepository } from "../../features/inventory/inventory.repository.js";
import type { PaymentRepository } from "../../features/payment/payment.repository.js";
import type { ReportRepository } from "./report.repository.js";
import type { RequestActor } from "../../core/types/auth.js";
import type { CacheService } from "../../core/cache/cache.service.js";

export class ReportService {
  public constructor(
    private readonly reportRepository: ReportRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly cache: CacheService,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async revenue(range: PaymentAnalyticsRange, actor: RequestActor): Promise<ReportDto> {
    ensureAdminOrAbove(actor.role);
    return this.cached(`reports:revenue:${range}`, async () => {
      const events = await this.paymentRepository.listRevenueEvents(range, this.clock());
      const totals = { revenueCents: events.reduce((total, event) => total + event.amountCents, 0) };
      return {
        type: "revenue",
        generatedAt: this.clock().toISOString(),
        totals,
        buckets: [{ label: range, amountCents: totals.revenueCents }],
        rows: events.map((event) => ({
          occurredAt: event.occurredAt.toISOString(),
          amountCents: event.amountCents
        }))
      };
    });
  }

  public async attendance(month: string, actor: RequestActor): Promise<ReportDto> {
    ensureAdminOrAbove(actor.role);
    return this.cached(`reports:attendance:${month}`, async () => {
      const start = monthStart(month);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      const counts = await this.attendanceRepository.countByCheckInDay(start, end);
      const total = counts.reduce((sum, row) => sum + row.count, 0);
      return {
        type: "attendance",
        generatedAt: this.clock().toISOString(),
        totals: { attendanceCount: total },
        buckets: counts.map((row) => ({ label: row.date, count: row.count })),
        rows: counts.map((row) => ({ date: row.date, count: row.count }))
      };
    });
  }

  public async memberships(actor: RequestActor): Promise<ReportDto> {
    ensureAdminOrAbove(actor.role);
    return this.cached("reports:memberships", async () => {
      const counts = await this.reportRepository.membershipStatusCounts();
      return {
        type: "memberships",
        generatedAt: this.clock().toISOString(),
        totals: { subscriptions: counts.reduce((total, row) => total + row.count, 0) },
        buckets: counts.map((row) => ({ label: row.label, count: row.count })),
        rows: counts.map((row) => ({ status: row.label, count: row.count }))
      };
    });
  }

  public async inventory(actor: RequestActor): Promise<ReportDto> {
    ensureAdminOrAbove(actor.role);
    return this.cached("reports:inventory", async () => {
      const valuation = await this.inventoryRepository.valuation();
      return {
        type: "inventory",
        generatedAt: this.clock().toISOString(),
        totals: { totalValueCents: valuation.totalValueCents },
        buckets: valuation.products.map((product) => ({ label: product.name, count: product.currentStock, amountCents: product.valueCents })),
        rows: valuation.products.map((product) => ({
          productId: product.productId,
          name: product.name,
          sku: product.sku,
          currentStock: product.currentStock,
          costCents: product.costCents,
          valueCents: product.valueCents
        }))
      };
    });
  }

  public async payments(actor: RequestActor): Promise<ReportDto> {
    ensureAdminOrAbove(actor.role);
    return this.cached("reports:payments", async () => {
      const rows = await this.reportRepository.invoiceStatusTotals();
      return {
        type: "payments",
        generatedAt: this.clock().toISOString(),
        totals: { amountDueCents: rows.reduce((total, row) => total + row.amountCents, 0) },
        buckets: rows.map((row) => ({ label: row.label, amountCents: row.amountCents })),
        rows: rows.map((row) => ({ status: row.label, amountCents: row.amountCents }))
      };
    });
  }

  public async trainerPerformance(actor: RequestActor): Promise<ReportDto> {
    ensureAdminOrAbove(actor.role);
    return this.cached("reports:trainer-performance", async () => {
      const rows = await this.reportRepository.trainerPerformance();
      return {
        type: "trainer-performance",
        generatedAt: this.clock().toISOString(),
        totals: { trainers: rows.length },
        buckets: rows.map((row) => ({ label: row.staffProfileId, count: row.workoutPlans + row.dietPlans })),
        rows: rows.map((row) => ({
          staffProfileId: row.staffProfileId,
          userId: row.userId,
          workoutPlans: row.workoutPlans,
          dietPlans: row.dietPlans,
          leaveRequests: row.leaveRequests
        }))
      };
    });
  }

  public async growthRetention(actor: RequestActor): Promise<ReportDto> {
    ensureAdminOrAbove(actor.role);
    return this.cached("reports:growth-retention", async () => {
      const now = this.clock();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const rows = await this.reportRepository.memberGrowthByMonth(start, end);
      return {
        type: "growth-retention",
        generatedAt: this.clock().toISOString(),
        totals: { joined: rows.reduce((total, row) => total + row.joined, 0) },
        buckets: rows.map((row) => ({ label: row.month, count: row.joined })),
        rows: rows.map((row) => ({ month: row.month, joined: row.joined }))
      };
    });
  }

  public toCsv(report: ReportDto): string {
    const keys = [...new Set(report.rows.flatMap((row) => Object.keys(row)))];
    const lines = [keys.join(",")];
    for (const row of report.rows) {
      lines.push(keys.map((key) => csvCell(row[key] ?? "")).join(","));
    }
    return lines.join("\n");
  }

  private async cached(key: string, compute: () => Promise<ReportDto>): Promise<ReportDto> {
    const cached = await this.cache.get<ReportDto>(key);
    if (cached) {
      return cached;
    }
    const report = await compute();
    await this.cache.set(key, report);
    return report;
  }
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }
  throw errors.forbidden();
}

function monthStart(month: string): Date {
  const [year, index] = month.split("-").map(Number);
  if (!year || !index || index < 1 || index > 12) {
    throw errors.badRequest("month must use YYYY-MM format");
  }
  return new Date(Date.UTC(year, index - 1, 1));
}

function csvCell(value: string | number): string {
  const raw = String(value);
  if (!/[",\n]/.test(raw)) {
    return raw;
  }
  return `"${raw.replaceAll("\"", "\"\"")}"`;
}
