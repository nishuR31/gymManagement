import type { PaymentAnalyticsRange, ReportDto } from "@gym/shared";
import { paymentAnalyticsRanges } from "@gym/shared";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Download, Dumbbell, Package, Receipt, TrendingUp, Users, WalletCards } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { SkeletonRows } from "../components/ui/Skeleton";
import * as reportApi from "../features/reports/reportApi";
import type { ReportType } from "../features/reports/reportApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents, formatDateTime, readableStatus } from "../utils/format";

const reportOptions: { type: ReportType; label: string; icon: LucideIcon }[] = [
  { type: "revenue", label: "Revenue", icon: TrendingUp },
  { type: "attendance", label: "Attendance", icon: BarChart3 },
  { type: "memberships", label: "Memberships", icon: WalletCards },
  { type: "inventory", label: "Inventory", icon: Package },
  { type: "payments", label: "Payments", icon: Receipt },
  { type: "trainer-performance", label: "Trainers", icon: Dumbbell },
  { type: "growth-retention", label: "Growth", icon: Users }
];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ReportsPage() {
  const [type, setType] = useState<ReportType>("revenue");
  const [range, setRange] = useState<PaymentAnalyticsRange>("monthly");
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<ReportDto | null>(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({
      ...(type === "revenue" ? { range } : {}),
      ...(type === "attendance" ? { month } : {})
    }),
    [month, range, type]
  );

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      setReport(await reportApi.getReport(type, params));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load report"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [type, params]);

  const download = async (): Promise<void> => {
    try {
      const blob = await reportApi.downloadReportCsv(type, params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not download CSV"));
    }
  };

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="bg-card flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border p-4 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Business Intelligence</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">Operational exports and cached aggregates</p>
        </div>
        <Button variant="secondary" onClick={() => void download()} disabled={!report}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Download CSV
        </Button>
      </div>

      <Card title="Report Controls">
        <div className="flex flex-wrap gap-2">
          {reportOptions.map((option) => (
            (() => {
              const Icon = option.icon;
              return (
            <button
              key={option.type}
              className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold transition focus-visible:focus-ring ${
                type === option.type ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
              onClick={() => setType(option.type)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {option.label}
            </button>
              );
            })()
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {type === "revenue" ? (
            <label className="grid gap-2 text-sm font-medium text-foreground">
              <span>Range</span>
              <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25" value={range} onChange={(event) => setRange(event.target.value as PaymentAnalyticsRange)}>
                {paymentAnalyticsRanges.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          ) : null}
          {type === "attendance" ? <Input label="Month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /> : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card title="Totals">
          {loading ? <SkeletonRows rows={3} /> : null}
          {!loading && report ? (
            <div className="grid gap-3">
              {Object.entries(report.totals).map(([key, value]) => (
                <div key={key} className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{readableStatus(key)}</p>
                  <p className="numeric mt-1 text-2xl font-black text-foreground">{key.toLowerCase().includes("cents") ? formatCents(value) : value}</p>
                </div>
              ))}
              <p className="text-xs font-semibold text-muted-foreground">Generated {formatDateTime(report.generatedAt)}</p>
            </div>
          ) : null}
        </Card>

        <Card title="Buckets">
          {!loading && (report?.buckets.length ?? 0) === 0 ? <EmptyState title="No bucket data" /> : null}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report?.buckets ?? []}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} width={80} />
                <Tooltip
                  cursor={{ fill: "color-mix(in srgb, hsl(var(--primary)) 8%, transparent)" }}
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                  formatter={(value) => (typeof value === "number" && value > 999 ? formatCents(value) : value)}
                />
                <Bar dataKey={report?.buckets.some((bucket) => bucket.amountCents !== undefined) ? "amountCents" : "count"} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Rows">
        {loading ? <SkeletonRows /> : null}
        {!loading && (report?.rows.length ?? 0) === 0 ? <EmptyState title="No rows found" /> : null}
        {report && report.rows.length > 0 ? <ReportTable rows={report.rows} /> : null}
      </Card>
    </section>
  );
}

function ReportTable({ rows }: { rows: ReportDto["rows"] }) {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            {keys.map((key) => (
              <th key={key} className="px-3 py-2">{readableStatus(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, index) => (
            <tr key={index}>
              {keys.map((key) => (
                <td key={key} className={`px-3 py-3 text-muted-foreground ${typeof row[key] === "number" || key.toLowerCase().includes("id") || key.toLowerCase().includes("cents") ? "numeric" : ""}`}>
                  {formatCell(key, row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(key: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "number" && key.toLowerCase().includes("cents")) {
    return formatCents(value);
  }
  return String(value);
}
