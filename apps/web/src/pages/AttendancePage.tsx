import type { AttendanceDto, DailyAttendanceDto, MonthlyAttendanceDto, PaginatedAttendanceDto } from "@gym/shared";
import { useEffect, useState } from "react";
import { Activity, Search, LogOut, CheckCircle2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import * as attendanceApi from "../features/attendance/attendanceApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime } from "../utils/format";

export function AttendancePage() {
  const [currentAttendances, setCurrentAttendances] = useState<AttendanceDto[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyAttendanceDto | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyAttendanceDto | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [disambiguationMatches, setDisambiguationMatches] = useState<attendanceApi.DisambiguationMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyData, setHistoryData] = useState<PaginatedAttendanceDto | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const thisMonth = today.slice(0, 7);

      const [current, daily, monthly] = await Promise.all([
        attendanceApi.listCurrent(),
        attendanceApi.getDailyAttendance(today),
        attendanceApi.getMonthlyAttendance(thisMonth)
      ]);
      setCurrentAttendances(current);
      setDailyStats(daily);
      setMonthlyStats(monthly);
    } catch (error) {
      toast.error("Could not load attendance data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async (page: number): Promise<void> => {
    setIsHistoryLoading(true);
    try {
      const data = await attendanceApi.listHistory({ page, pageSize: 20 });
      setHistoryData(data);
    } catch (error) {
      toast.error("Could not load attendance history");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory(historyPage);
  }, [historyPage]);

  const handleCheckIn = async (queryOverride?: string): Promise<void> => {
    const query = queryOverride ?? searchQuery.trim();
    if (!query) return;

    setIsCheckingIn(true);
    try {
      const result = await attendanceApi.checkIn({ query });

      if (result.matches) {
        setDisambiguationMatches(result.matches);
      } else if (result.attendance) {
        toast.success(`Checked in ${result.attendance.member.firstName} ${result.attendance.member.lastName}`);
        setSearchQuery("");
        setDisambiguationMatches([]);
        void loadData();
        void loadHistory(historyPage);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Check-in failed"));
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async (attendanceId: string, memberName: string): Promise<void> => {
    try {
      await attendanceApi.checkOut({ attendanceId });
      toast.success(`Checked out ${memberName}`);
      void loadData();
      void loadHistory(historyPage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Check-out failed"));
    }
  };

  return (
    <section className="grid max-w-7xl min-w-0 gap-6 animate-fade-in">
      <div className="bg-card grid gap-4 rounded-lg border border-border p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Front Desk</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Attendance</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">Manage check-ins and active members</p>
        </div>
        <div className="flex flex-col gap-2 min-w-[300px]">
          <form
            onSubmit={(e) => { e.preventDefault(); void handleCheckIn(); }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Input
                placeholder="Search name, phone, or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isCheckingIn}
                autoFocus
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <Button type="submit" disabled={isCheckingIn || !searchQuery.trim()}>
              Check In
            </Button>
          </form>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,420px)]">
        <Card title="Currently In Gym" action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            {currentAttendances.length} Active
          </span>
        }>
          {isLoading && currentAttendances.length === 0 ? <SkeletonRows /> : null}
          {!isLoading && currentAttendances.length === 0 ? (
            <EmptyState title="Gym is empty" description="No members are currently checked in." />
          ) : null}
          <div className="grid gap-3">
            {currentAttendances.map((attendance) => (
              <div key={attendance.id} className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-surface/70 p-3 transition hover:border-primary/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {attendance.member.firstName} {attendance.member.lastName}
                    </p>
                    <p className="truncate text-xs font-semibold text-muted-foreground">
                      Checked in at {formatDateTime(attendance.checkInAt)} · {attendance.checkInMethod}
                    </p>
                  </div>
                </div>
                <Button variant="secondary" className="h-9 px-3 shrink-0" onClick={() => void handleCheckOut(attendance.id, attendance.member.firstName)}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Check Out
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card title="Today's Overview">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Total Visits</p>
                <p className="numeric mt-2 text-3xl font-black text-foreground">{dailyStats?.count ?? 0}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Currently Active</p>
                <p className="numeric mt-2 text-3xl font-black text-foreground">{currentAttendances.length}</p>
              </div>
            </div>
          </Card>

          <Card title="Monthly Trend">
            <div className="h-64">
              {monthlyStats && monthlyStats.days.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyStats.days}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => new Date(val).getDate().toString()}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      cursor={{ fill: "color-mix(in srgb, hsl(var(--primary)) 8%, transparent)" }}
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                      formatter={(value: any) => [value as number, "Check-ins"]}
                      labelFormatter={(label: any) => new Date(label as string).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-sm font-semibold text-muted-foreground">
                  No data for this month
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Attendance History" className="mt-4">
        {isHistoryLoading && !historyData ? <SkeletonRows /> : null}
        {!isHistoryLoading && (!historyData || historyData.data.length === 0) ? (
          <EmptyState title="No attendance history" />
        ) : null}
        {historyData && historyData.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full text-left text-sm">
                <thead className="bg-background text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyData.data.map((att) => (
                    <tr key={att.id} className="transition hover:bg-surface/50">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {att.member.firstName} {att.member.lastName}
                        <div className="text-xs font-normal text-muted-foreground">{att.member.memberCode}</div>
                      </td>
                      <td className="px-4 py-3">{formatDateTime(att.checkInAt)}</td>
                      <td className="px-4 py-3">
                        {att.checkOutAt ? (
                          formatDateTime(att.checkOutAt)
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
                            </span>
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                          {att.checkInMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">{att.durationMinutes ? `${att.durationMinutes} min` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {historyData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border p-4">
                <span className="text-sm font-semibold text-muted-foreground">
                  Page {historyData.pagination.page} of {historyData.pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={historyData.pagination.page === 1}
                    onClick={() => setHistoryPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={historyData.pagination.page === historyData.pagination.totalPages}
                    onClick={() => setHistoryPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </Card>

      <Modal title="Multiple Members Found" open={disambiguationMatches.length > 0} onClose={() => setDisambiguationMatches([])}>
        <div className="grid gap-3">
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            Please select the correct member to check in:
          </p>
          {disambiguationMatches.map(match => (
            <button
              key={match.id}
              onClick={() => void handleCheckIn(match.memberCode)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-surface/70 p-3 text-left transition hover:border-primary focus-visible:focus-ring"
            >
              <div>
                <p className="font-bold text-foreground">{match.firstName} {match.lastName}</p>
                <p className="numeric text-xs font-semibold text-muted-foreground">{match.phone}</p>
              </div>
              <p className="numeric text-xs font-black text-primary">{match.memberCode}</p>
            </button>
          ))}
        </div>
      </Modal>
    </section>
  );
}
