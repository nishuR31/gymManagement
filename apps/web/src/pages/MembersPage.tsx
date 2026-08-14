import { zodResolver } from "@hookform/resolvers/zod";
import {
  createColumnHelper,
  flexRender,
  stockFeatures,
  useTable,
} from "@tanstack/react-table";
import type { StockFeatures } from "@tanstack/react-table";
import type {
  MemberDietPlanDto,
  MemberDto,
  MemberLoginSetupDto,
  MemberStatus,
  MemberWorkoutPlanDto,
  MembershipSubscriptionDto,
  InvoiceDto,
  PaymentDto,
  RoleName,
} from "@gym/shared";
import { memberStatuses } from "@gym/shared";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Archive,
  Eye,
  Pencil,
  QrCode,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { StatusBadge } from "../components/ui/StatusBadge";
import * as memberApi from "../features/members/memberApi";
import * as membershipApi from "../features/memberships/membershipApi";
import * as paymentApi from "../features/payments/paymentApi";
import * as staffApi from "../features/staff/staffApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents } from "../utils/format";

const formSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(80),
  lastName: z.string().trim().min(1, "Required").max(80),
  phone: z.string().trim().min(5, "Required").max(30),
  email: z.string().trim().email("Invalid email").or(z.literal("")),
  dateOfBirth: z.string(),
  gender: z.string().trim().max(255),
  address: z.string().trim().max(1000),
  emergencyContactName: z.string().trim().max(255),
  emergencyContactPhone: z.string().trim().max(255),
  medicalNotes: z.string().trim().max(5000),
  heightCm: z.coerce.number().positive().max(500).or(z.literal("")),
  weightKg: z.coerce.number().positive().max(500).or(z.literal("")),
});

type MemberFormValues = z.infer<typeof formSchema>;
type ConfirmAction = "suspend" | "restore" | "archive" | "disableSecurity";

const defaultValues: MemberFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  medicalNotes: "",
  heightCm: "",
  weightKg: "",
};

const features = stockFeatures;
const columnHelper = createColumnHelper<StockFeatures, MemberDto>();

export function MembersPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MemberStatus | "">("");
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "payments" | "plans">(
    "profile",
  );
  const [memberPayments, setMemberPayments] = useState<PaymentDto[]>([]);
  const [memberWorkouts, setMemberWorkouts] = useState<MemberWorkoutPlanDto[]>(
    [],
  );
  const [memberDiets, setMemberDiets] = useState<MemberDietPlanDto[]>([]);
  const [memberSubscriptions, setMemberSubscriptions] = useState<
    MembershipSubscriptionDto[]
  >([]);
  const [memberInvoices, setMemberInvoices] = useState<InvoiceDto[]>([]);
  const [editingMember, setEditingMember] = useState<MemberDto | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [loginSetup, setLoginSetup] = useState<MemberLoginSetupDto | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [suspendReason, setSuspendReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canManageLifecycle = isAdminRole(role);
  const canManageMedicalNotes = isAdminRole(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    // @ts-ignore
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const loadMembers = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await memberApi.listMembers({
        page: 1,
        pageSize: 25,
        ...(status ? { status } : {}),
        ...(search ? { search } : {}),
      });
      setMembers(response.data);
    } catch {
      toast.error("Could not load members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [status]);

  const columns = useMemo(
    () => columnHelper.columns([
      columnHelper.accessor("memberCode", {
        header: "Member ID",
        cell: (info) => (
          <span className="numeric font-semibold text-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
        id: "name",
        header: "Name",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Details",
        cell: (info) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              className="h-9 px-3"
              title="View member"
              aria-label="View member"
              onClick={() => void selectMember(info.row.original)}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              See Details
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 px-0"
              title="Edit member"
              aria-label="Edit member"
              onClick={() => startEdit(info.row.original)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ),
      }),
    ]),
    [],
  );

  const table = useTable({
    data: members,
    columns,
    features,
  });

  const onSubmit = async (values: MemberFormValues): Promise<void> => {
    const payload = normalizePayload(values, canManageMedicalNotes);

    try {
      if (editingMember) {
        const updated = await memberApi.updateMember(editingMember.id, payload);
        toast.success("Member updated");
        setEditingMember(updated);
        setSelectedMember(updated);
      } else {
        const created = await memberApi.createMember(payload);
        toast.success("Member created");
        setSelectedMember(created);
      }
      reset(defaultValues);
      setEditingMember(null);
      setIsFormOpen(false);
      await loadMembers();
    } catch {
      toast.error("Could not save member");
    }
  };

  const startEdit = (member: MemberDto): void => {
    setEditingMember(member);
    setIsFormOpen(true);
    setSelectedMember(member);
    setQrPayload(null);
    reset({
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone,
      email: member.email ?? "",
      dateOfBirth: member.dateOfBirth ?? "",
      gender: member.gender ?? "",
      address: member.address ?? "",
      emergencyContactName: member.emergencyContactName ?? "",
      emergencyContactPhone: member.emergencyContactPhone ?? "",
      medicalNotes: member.medicalNotes ?? "",
      heightCm: member.heightCm ?? "",
      weightKg: member.weightKg ?? "",
    });
  };

  const selectMember = async (member: MemberDto): Promise<void> => {
    setSelectedMember(member);
    setDetailTab("profile");
    setMemberPayments([]);
    setMemberWorkouts([]);
    setMemberDiets([]);
    setMemberSubscriptions([]);
    setMemberInvoices([]);
    setQrPayload(null);
    try {
      const [qr, payments, workouts, diets, subscriptions, invoices] =
        await Promise.all([
          memberApi.getMemberQr(member.id).catch(() => null),
          paymentApi.listMemberPayments(member.id).catch(() => []),
          staffApi.listMemberWorkouts(member.id).catch(() => []),
          staffApi.listMemberDiets(member.id).catch(() => []),
          membershipApi.listMemberSubscriptions(member.id).catch(() => []),
          paymentApi.listMemberInvoices(member.id).catch(() => []),
        ]);
      setMemberPayments(payments);
      setMemberWorkouts(workouts);
      setMemberDiets(diets);
      setMemberSubscriptions(subscriptions);
      setMemberInvoices(invoices);
      if (!qr) {
        return;
      }
      setQrPayload(qr.qrPayload);
    } catch {
      setQrPayload(null);
    }
  };

  const cancelCurrentSubscription = async (): Promise<void> => {
    if (!selectedMember) {
      return;
    }
    const subscription = currentSubscriptionFor(memberSubscriptions);
    if (!subscription) {
      toast.error("No active subscription to cancel");
      return;
    }
    if (
      !window.confirm(
        "Cancel this member subscription? Any open invoice for this subscription will also be cancelled.",
      )
    ) {
      return;
    }
    try {
      await membershipApi.cancelSubscription(
        selectedMember.id,
        subscription.id,
      );
      toast.success("Subscription cancelled");
      await selectMember(selectedMember);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not cancel subscription"));
    }
  };

  const suspendSelected = async (): Promise<void> => {
    if (!selectedMember) {
      return;
    }
    if (!suspendReason.trim()) {
      toast.error("Suspension reason is required");
      return;
    }
    const member = await memberApi.suspendMember(
      selectedMember.id,
      suspendReason.trim(),
    );
    toast.success("Member suspended");
    setSelectedMember(member);
    setConfirmAction(null);
    setSuspendReason("");
    await loadMembers();
  };

  const restoreSelected = async (): Promise<void> => {
    if (!selectedMember) {
      return;
    }
    const member = await memberApi.restoreMember(selectedMember.id);
    toast.success("Member restored");
    setSelectedMember(member);
    setConfirmAction(null);
    await loadMembers();
  };

  const archiveSelected = async (): Promise<void> => {
    if (!selectedMember) {
      return;
    }
    const member = await memberApi.archiveMember(selectedMember.id);
    toast.success("Member archived");
    setSelectedMember(member);
    setConfirmAction(null);
    await loadMembers();
  };

  const regenerateQr = async (): Promise<void> => {
    if (!selectedMember) {
      return;
    }
    const qr = await memberApi.regenerateMemberQr(selectedMember.id);
    toast.success("QR regenerated");
    setQrPayload(qr.qrPayload);
  };

  const createLogin = async (): Promise<void> => {
    if (!selectedMember) {
      return;
    }
    try {
      const login = await memberApi.createMemberLogin(selectedMember.id);
      toast.success(
        login.regenerated ? "Member login regenerated" : "Member login created",
      );
      setLoginSetup(login);
      setSelectedMember(login.member);
      await loadMembers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create member login"));
    }
  };

  const requestSecurityDisableSelected = async (): Promise<void> => {
    if (!selectedMember || !selectedMember.userId) {
      return;
    }
    try {
      const { requestSecurityDisable } = await import("../features/auth/authApi");
      await requestSecurityDisable(selectedMember.userId);
      toast.success("Security disable requested successfully");
      setConfirmAction(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to request security disable"));
    }
  };

  return (
    <section className="grid max-w-7xl min-w-0 gap-6 animate-fade-in">
      <div className="bg-card grid gap-4 rounded-lg border border-border p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(280px,auto)] md:items-end">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Member Operations
          </p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Members</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {members.length} shown
          </p>
        </div>
        <form
          className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void loadMembers();
          }}
        >
          <Input
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
            <span>Status</span>
            <select
              className="h-11 w-full rounded-md border border-border bg-surface/70 px-3 text-sm outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as MemberStatus | "")
              }
            >
              <option value="">All</option>
              {memberStatuses.map((item) => (
                <option key={item} value={item}>
                  {formatStatus(item)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary" className="self-end">
            Filter
          </Button>
        </form>
      </div>

      <div className="grid min-w-0 gap-6">
        <div className="min-w-0 rounded-lg border border-border bg-card shadow-sm">
          <div className="grid gap-3 p-3 md:hidden">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-md border border-border bg-surface/80 p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="numeric text-xs font-black text-primary">
                      {member.memberCode}
                    </p>
                    <p className="mt-1 truncate text-base font-black text-foreground">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="numeric mt-1 truncate text-sm font-semibold text-muted-foreground">
                      {member.phone}
                    </p>
                  </div>
                  <StatusBadge status={member.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="h-9 px-3"
                    onClick={() => void selectMember(member)}
                  >
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-9 px-3"
                    onClick={() => startEdit(member)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <Button onClick={() => setIsFormOpen(true)} className="w-full">
                + Add New Member
              </Button>
            </div>
            {!isLoading && members.length === 0 ? (
              <EmptyState
                title="No members found"
                description="Create a member or adjust the current filters."
              />
            ) : null}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full table-fixed min-w-[800px] text-left text-sm">
              <colgroup>
                <col className="w-[160px]" />
                <col />
                <col className="w-[130px]" />
                <col className="w-[230px]" />
              </colgroup>
              <thead className="bg-background text-xs font-semibold uppercase text-muted-foreground">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-line">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group align-middle transition hover:bg-secondary/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && members.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No members found"
                  description="Create a member or adjust the current filters."
                />
              </div>
            ) : null}
            <div className="p-4 mt-2">
              <Button onClick={() => setIsFormOpen(true)}>
                + Add New Member
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <Modal 
        title={editingMember ? "Edit Member" : "New Member"}
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMember(null);
          reset(defaultValues);
        }}
      >
        <form
          className="grid gap-4"
          // @ts-ignore
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              error={errors.firstName?.message}
              {...register("firstName")}
            />
            <Input
              label="Last name"
              error={errors.lastName?.message}
              {...register("lastName")}
            />
          </div>
          <Input
            label="Phone"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date of birth"
              type="date"
              error={errors.dateOfBirth?.message}
              {...register("dateOfBirth")}
            />
            <Input
              label="Gender"
              error={errors.gender?.message}
              {...register("gender")}
            />
          </div>
          <Input
            label="Address"
            error={errors.address?.message}
            {...register("address")}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Emergency name"
              error={errors.emergencyContactName?.message}
              {...register("emergencyContactName")}
            />
            <Input
              label="Emergency phone"
              error={errors.emergencyContactPhone?.message}
              {...register("emergencyContactPhone")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Height cm"
              type="number"
              step="0.1"
              error={errors.heightCm?.message}
              {...register("heightCm")}
            />
            <Input
              label="Weight kg"
              type="number"
              step="0.1"
              error={errors.weightKg?.message}
              {...register("weightKg")}
            />
          </div>
          {canManageMedicalNotes ? (
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
              <span>Medical notes</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-surface/70 px-3 py-2 text-sm outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25"
                {...register("medicalNotes")}
              />
            </label>
          ) : null}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {editingMember ? "Save Changes" : "Create Member"}
            </Button>
          </div>
        </form>
      </Modal>

      <MemberDetailModal
        member={selectedMember}
        detailTab={detailTab}
        onTab={setDetailTab}
        payments={memberPayments}
        workouts={memberWorkouts}
        diets={memberDiets}
        subscriptions={memberSubscriptions}
        invoices={memberInvoices}
        qrPayload={qrPayload}
        canManageLifecycle={canManageLifecycle}
        isSuperAdmin={user?.role === "SUPER_ADMIN"}
        onClose={() => setSelectedMember(null)}
        onCancelSubscription={() => void cancelCurrentSubscription()}
        onSuspend={() => setConfirmAction("suspend")}
        onRestore={() => setConfirmAction("restore")}
        onRegenerateQr={() => void regenerateQr()}
        onCreateLogin={() => void createLogin()}
        onArchive={() => setConfirmAction("archive")}
        onDisableSecurity={() => setConfirmAction("disableSecurity")}
      />
      <MemberLoginModal
        login={loginSetup}
        onClose={() => setLoginSetup(null)}
      />
      <MemberLifecycleModal
        action={confirmAction}
        member={selectedMember}
        reason={suspendReason}
        onReason={setSuspendReason}
        onClose={() => {
          setConfirmAction(null);
          setSuspendReason("");
        }}
        onConfirm={() => {
          if (confirmAction === "suspend") {
            void suspendSelected();
          } else if (confirmAction === "restore") {
            void restoreSelected();
          } else if (confirmAction === "archive") {
            void archiveSelected();
          } else if (confirmAction === "disableSecurity") {
            void requestSecurityDisableSelected();
          }
        }}
      />
    </section>
  );
}

function MemberLifecycleModal({
  action,
  member,
  reason,
  onReason,
  onClose,
  onConfirm,
}: {
  action: ConfirmAction | null;
  member: MemberDto | null;
  reason: string;
  onReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const copy = {
    suspend: {
      title: "Suspend Member",
      body: "This member will be unable to check in until restored.",
    },
    restore: {
      title: "Restore Member",
      body: "This member will be able to check in again if their membership rules allow it.",
    },
    archive: {
      title: "Archive Member",
      body: "This member will leave active operations and should only be restored from records if needed.",
    },
    disableSecurity: {
      title: "Request Security Disable",
      body: "Are you sure you want to request this member to disable their 2FA and Passkeys? They will be notified when they log in.",
    },
  };
  const content = action ? copy[action] : null;

  return (
    <Modal
      title={content?.title ?? "Confirm"}
      open={!!action && !!member}
      onClose={onClose}
    >
      {content && member ? (
        <div className="grid gap-4">
          <div className="rounded-md border border-border bg-background p-3">
            <p className="font-bold text-foreground">
              {member.firstName} {member.lastName}
            </p>
            <p className="numeric mt-1 text-xs font-black text-primary">
              {member.memberCode}
            </p>
          </div>
          <p className="text-sm font-semibold leading-6 text-muted-foreground">
            {content.body}
          </p>
          {action === "suspend" ? (
            <Input
              label="Suspension reason"
              value={reason}
              onChange={(event) => onReason(event.target.value)}
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>{content.title}</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function MemberDetailModal({
  member,
  detailTab,
  onTab,
  payments,
  workouts,
  diets,
  subscriptions,
  invoices,
  qrPayload,
  canManageLifecycle,
  onClose,
  onCancelSubscription,
  onSuspend,
  onRestore,
  onRegenerateQr,
  onCreateLogin,
  onArchive,
}: {
  member: MemberDto | null;
  detailTab: "profile" | "payments" | "plans";
  onTab: (tab: "profile" | "payments" | "plans") => void;
  payments: PaymentDto[];
  workouts: MemberWorkoutPlanDto[];
  diets: MemberDietPlanDto[];
  subscriptions: MembershipSubscriptionDto[];
  invoices: InvoiceDto[];
  qrPayload: string | null;
  canManageLifecycle: boolean;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onCancelSubscription: () => void;
  onSuspend: () => void;
  onRestore: () => void;
  onRegenerateQr: () => void;
  onCreateLogin: () => void;
  onArchive: () => void;
  onDisableSecurity: () => void;
}) {
  return (
    <Modal
      title={
        member ? `${member.firstName} ${member.lastName}` : "Member Details"
      }
      open={!!member}
      onClose={onClose}
      size="wide"
    >
      {member ? (
        <div className="grid gap-5">
          <div className="rounded-lg border border-border bg-surface/75 p-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-secondary text-primary shadow-sm">
                <span className="text-lg font-black">
                  {initialsFor(member)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-2xl font-black text-foreground">
                    {member.firstName} {member.lastName}
                  </h3>
                  <StatusBadge status={member.status} />
                </div>
                <p className="numeric mt-1 text-sm font-black text-primary">
                  {member.memberCode}
                </p>
                <p className="numeric mt-2 truncate text-sm font-semibold text-muted-foreground">
                  {member.phone}
                </p>
              </div>
            </div>
          </div>

          <div className="flex rounded-md border border-border bg-background p-1">
            {(["profile", "payments", "plans"] as const).map((tab) => (
              <button
                key={tab}
                className={`h-9 flex-1 rounded px-2 text-sm font-bold capitalize transition focus-visible:focus-ring ${
                  detailTab === tab
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
                onClick={() => onTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {detailTab === "profile" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <div className="grid gap-4">
                <MemberSubscriptionSummary
                  subscriptions={subscriptions}
                  invoices={invoices}
                  onCancel={onCancelSubscription}
                  canCancel={canManageLifecycle}
                />
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Phone" value={member.phone} numeric />
                  <Detail label="Status" value={formatStatus(member.status)} />
                  <Detail
                    label="BMI"
                    value={member.bmi?.toString() ?? "-"}
                    numeric
                  />
                  <Detail label="Joined" value={member.joinedAt.slice(0, 10)} />
                </dl>
                {member.medicalNotes ? (
                  <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                    {member.medicalNotes}
                  </div>
                ) : null}
              </div>
              {qrPayload ? (
                <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                  <div className="dark-band-gradient border-b border-border p-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-foreground">
                      Membership Card
                    </p>
                    <p className="mt-1 truncate text-sm font-black text-foreground">
                      {member.firstName} {member.lastName}
                    </p>
                  </div>
                  <div className="grid gap-3 p-4">
                    <div className="grid aspect-square max-h-32 place-items-center rounded-md border border-border bg-card">
                      <QrCode
                        className="h-12 w-12 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        QR payload
                      </p>
                      <p className="numeric mt-1 break-all rounded-md bg-secondary p-2 text-xs font-semibold text-muted-foreground">
                        {qrPayload}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {detailTab === "payments" ? (
            <div className="grid gap-2">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments found.</p>
              ) : null}
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-md border border-border bg-background p-3 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <span className="numeric font-bold text-foreground">
                      {formatCents(payment.amountCents)}
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {payment.method}
                    </span>
                  </div>
                  {payment.refunds.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Refunded{" "}
                      <span className="numeric">
                        {formatCents(
                          payment.refunds.reduce(
                            (total, refund) => total + refund.amountCents,
                            0,
                          ),
                        )}
                      </span>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {detailTab === "plans" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 font-bold text-foreground">Workout Plans</p>
                {workouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No workout plans assigned.
                  </p>
                ) : null}
                <div className="grid gap-2">
                  {workouts.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-md border border-border bg-card p-3"
                    >
                      <p className="font-semibold">
                        Starts {plan.startDate.slice(0, 10)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.exercises.length} exercises
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 font-bold text-foreground">Diet Plans</p>
                {diets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No diet plans assigned.
                  </p>
                ) : null}
                <div className="grid gap-2">
                  {diets.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-md border border-border bg-card p-3"
                    >
                      <p className="font-semibold">
                        Starts {plan.startDate.slice(0, 10)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.meals.length} meals
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {canManageLifecycle ? (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                className="h-9 px-3"
                onClick={onSuspend}
              >
                <ShieldOff className="h-4 w-4" aria-hidden="true" />
                Suspend
              </Button>
              <Button
                variant="secondary"
                className="h-9 px-3"
                onClick={onRestore}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Restore
              </Button>
              <Button
                variant="secondary"
                className="h-9 px-3"
                onClick={onRegenerateQr}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Regenerate QR
              </Button>
              <Button
                variant="secondary"
                className="h-9 px-3"
                onClick={onCreateLogin}
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                {member.userId ? "Regenerate Login" : "Create Login"}
              </Button>
              <Button
                variant="secondary"
                className="h-9 px-3 text-destructive"
                onClick={onArchive}
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                Delete Member
              </Button>
              {member.userId && isSuperAdmin ? (
                <Button
                  variant="secondary"
                  className="h-9 px-3 text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
                  onClick={onDisableSecurity}
                >
                  <ShieldOff className="h-4 w-4" aria-hidden="true" />
                  Request 2FA Disable
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function MemberSubscriptionSummary({
  subscriptions,
  invoices,
  canCancel,
  onCancel,
}: {
  subscriptions: MembershipSubscriptionDto[];
  invoices: InvoiceDto[];
  canCancel: boolean;
  onCancel: () => void;
}) {
  const subscription = currentSubscriptionFor(subscriptions);
  const invoice = subscription
    ? (invoices.find((item) => item.subscriptionId === subscription.id) ?? null)
    : null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-background p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
            <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
            Current Membership
          </p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {subscription
              ? "Active subscription attached to this member"
              : "No active subscription assigned"}
          </p>
        </div>
        {subscription ? <StatusBadge status={subscription.status} /> : null}
      </div>
      {subscription ? (
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Plan</span>
            <span className="min-w-0 truncate font-bold text-foreground">
              {subscription.planName}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Period</span>
            <span className="numeric text-right font-semibold text-muted-foreground">
              {subscription.startDate} to {subscription.endDate}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Payment</span>
            <span className="flex flex-wrap justify-end gap-2">
              {invoice ? (
                <StatusBadge status={invoice.status} />
              ) : (
                <span className="text-xs font-bold text-warning">
                  No invoice
                </span>
              )}
              {invoice ? (
                <span className="numeric text-xs font-bold text-muted-foreground">
                  {formatCents(invoice.remainingCents)} due
                </span>
              ) : null}
            </span>
          </div>
          {canCancel ? (
            <Button
              variant="secondary"
              className="mt-2 h-9 justify-self-start px-3 text-destructive"
              onClick={onCancel}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Remove Membership
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground">
          Assign a subscription from the Memberships page.
        </p>
      )}
    </div>
  );
}

function MemberLoginModal({
  login,
  onClose,
}: {
  login: MemberLoginSetupDto | null;
  onClose: () => void;
}) {
  const copyPassword = async (): Promise<void> => {
    if (!login) {
      return;
    }
    await navigator.clipboard.writeText(login.temporaryPassword);
    toast.success("Temporary password copied");
  };

  return (
    <Modal
      title={
        login?.regenerated ? "Member Login Regenerated" : "Member Login Created"
      }
      open={!!login}
      onClose={onClose}
    >
      {login ? (
        <div className="grid gap-4">
          <div className="rounded-md border border-warning bg-warning-soft p-3 text-sm font-semibold text-warning">
            This temporary password is shown once. It will not be shown again
            after you close this window.
          </div>
          <Detail
            label="Member"
            value={`${login.member.firstName} ${login.member.lastName}`}
          />
          <Detail label="Email" value={login.user.email} />
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Temporary password
            </p>
            <p className="mt-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-lg font-black text-foreground">
              {login.temporaryPassword}
            </p>
          </div>
          <Button onClick={() => void copyPassword()}>Copy Password</Button>
        </div>
      ) : null}
    </Modal>
  );
}

function Detail({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 font-semibold text-foreground ${numeric ? "numeric" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function isAdminRole(role: RoleName | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN";
}

function formatStatus(status: MemberStatus): string {
  return status.replace("_", " ");
}

function initialsFor(member: MemberDto): string {
  return `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
}

function currentSubscriptionFor(
  subscriptions: MembershipSubscriptionDto[],
): MembershipSubscriptionDto | null {
  return (
    subscriptions.find(
      (subscription) =>
        subscription.status === "ACTIVE" || subscription.status === "FROZEN",
    ) ?? null
  );
}

function normalizePayload(
  values: MemberFormValues,
  includeMedicalNotes: boolean,
): memberApi.MemberPayload {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone.trim(),
    ...(values.email ? { email: values.email.trim() } : {}),
    ...(values.dateOfBirth ? { dateOfBirth: values.dateOfBirth } : {}),
    ...(values.gender ? { gender: values.gender.trim() } : {}),
    ...(values.address ? { address: values.address.trim() } : {}),
    ...(values.emergencyContactName
      ? { emergencyContactName: values.emergencyContactName.trim() }
      : {}),
    ...(values.emergencyContactPhone
      ? { emergencyContactPhone: values.emergencyContactPhone.trim() }
      : {}),
    ...(includeMedicalNotes && values.medicalNotes
      ? { medicalNotes: values.medicalNotes.trim() }
      : {}),
    ...(values.heightCm !== "" ? { heightCm: Number(values.heightCm) } : {}),
    ...(values.weightKg !== "" ? { weightKg: Number(values.weightKg) } : {}),
  };
}
