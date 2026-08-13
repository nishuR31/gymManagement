import type { LeaveRequestDto, StaffProfileDto, StaffProfileRole } from "@gym/shared";
import { staffProfileRoles } from "@gym/shared";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SkeletonRows } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import * as staffApi from "../features/staff/staffApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents, formatDateTime } from "../utils/format";
import { isAdminRole } from "../utils/roles";

export function StaffPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [profiles, setProfiles] = useState<StaffProfileDto[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDto[]>([]);
  const [selected, setSelected] = useState<StaffProfileDto | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const canAdmin = isAdminRole(user?.role);
  const ownProfile = useMemo(() => profiles.find((profile) => profile.userId === user?.id) ?? null, [profiles, user?.id]);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const rows = await staffApi.listProfiles();
      setProfiles(rows);
      setSelected((current) => current ? rows.find((row) => row.id === current.id) ?? rows[0] ?? null : rows[0] ?? null);
      setLeaveRequests(await staffApi.listLeaveRequests().catch(() => []));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load staff"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const checkIn = async (profile: StaffProfileDto): Promise<void> => {
    try {
      await staffApi.checkInStaff(profile.id);
      toast.success("Checked in");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not check in"));
    }
  };

  const checkOut = async (profile: StaffProfileDto): Promise<void> => {
    try {
      await staffApi.checkOutStaff(profile.id);
      toast.success("Checked out");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not check out"));
    }
  };

  const review = async (request: LeaveRequestDto, status: "APPROVED" | "REJECTED"): Promise<void> => {
    try {
      await staffApi.reviewLeaveRequest(request.id, status);
      toast.success("Leave request reviewed");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not review leave request"));
    }
  };

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="bg-card flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border p-4 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">People Ops</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Staff & Trainers</h2>
          <p className="mt-1 text-sm text-muted-foreground">Profiles, attendance, and leave requests</p>
        </div>
        {canAdmin ? <Button onClick={() => setProfileOpen(true)}><UserRound className="h-4 w-4" aria-hidden="true" />New Profile</Button> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card title="Staff List">
          {loading ? <SkeletonRows /> : null}
          {!loading && profiles.length === 0 ? <EmptyState title="No staff profiles" /> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Role</th>
                  {canAdmin ? <th className="px-3 py-2">Salary</th> : null}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-3 py-3">
                      <p className="numeric font-bold text-foreground">{profile.userId}</p>
                      <StatusBadge status={profile.isActive ? "ACTIVE" : "CANCELLED"} />
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={profile.role} /></td>
                    {canAdmin ? <td className="numeric px-3 py-3">{profile.salaryCents !== undefined ? formatCents(profile.salaryCents) : "-"}</td> : null}
                    <td className="px-3 py-3 text-right">
                      <Button variant="secondary" className="h-9 px-3" onClick={() => setSelected(profile)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Staff Detail">
          {selected ? (
            <div className="grid gap-4">
              <div>
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <StatusBadge status={selected.role} />
                <p className="numeric mt-2 break-all text-base font-bold text-foreground">{selected.userId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(canAdmin || selected.id === ownProfile?.id) ? (
                  <>
                    <Button variant="secondary" onClick={() => void checkIn(selected)}>Check In</Button>
                    <Button variant="secondary" onClick={() => void checkOut(selected)}>Check Out</Button>
                    <Button onClick={() => setLeaveOpen(true)}>Request Leave</Button>
                  </>
                ) : null}
              </div>
              <div className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                <CalendarClock className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                Attendance history endpoint is not available yet; current backend exposes check-in/check-out only.
              </div>
            </div>
          ) : (
            <EmptyState title="Select staff profile" />
          )}
        </Card>
      </div>

      <Card title="Leave Requests">
        {leaveRequests.length === 0 ? <EmptyState title="No leave requests" /> : null}
        <div className="grid gap-2">
          {leaveRequests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3 text-sm">
              <div>
                <p className="font-bold text-foreground">{request.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {request.startDate.slice(0, 10)} to {request.endDate.slice(0, 10)} · <span className="numeric">{request.staffProfileId}</span>
                </p>
                {request.reviewedAt ? <p className="text-xs text-muted-foreground">Reviewed {formatDateTime(request.reviewedAt)}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={request.status} />
                {canAdmin && request.status === "PENDING" ? (
                  <>
                    <Button variant="secondary" className="h-9 px-3" onClick={() => void review(request, "REJECTED")}>Reject</Button>
                    <Button className="h-9 px-3" onClick={() => void review(request, "APPROVED")}>Approve</Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onSaved={() => void load()} />
      <LeaveModal profile={selected} open={leaveOpen} onClose={() => setLeaveOpen(false)} onSaved={() => void load()} />
    </section>
  );
}

function ProfileModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<StaffProfileRole>("STAFF");
  const [salary, setSalary] = useState("");

  const submit = async (): Promise<void> => {
    try {
      await staffApi.createProfile({ userId, role, salaryCents: Math.round(Number(salary) * 100) });
      toast.success("Staff profile created");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create profile"));
    }
  };

  return (
    <Modal title="New Staff Profile" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <Input label="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} />
        <label className="grid gap-2 text-sm font-medium text-foreground">
          <span>Profile role</span>
          <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25" value={role} onChange={(event) => setRole(event.target.value as StaffProfileRole)}>
            {staffProfileRoles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <Input label="Salary" type="number" step="0.01" value={salary} onChange={(event) => setSalary(event.target.value)} />
        <Button onClick={() => void submit()}>Create Profile</Button>
      </div>
    </Modal>
  );
}

function LeaveModal({ profile, open, onClose, onSaved }: { profile: StaffProfileDto | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const submit = async (): Promise<void> => {
    if (!profile) return;
    try {
      await staffApi.createLeaveRequest({ staffProfileId: profile.id, startDate, endDate, reason });
      toast.success("Leave requested");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not request leave"));
    }
  };

  return (
    <Modal title="Request Leave" open={open && !!profile} onClose={onClose}>
      <div className="grid gap-3">
        <Input label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <Input label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        <Input label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button onClick={() => void submit()}>Submit Request</Button>
      </div>
    </Modal>
  );
}
