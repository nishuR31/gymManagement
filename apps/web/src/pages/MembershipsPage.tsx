import { zodResolver } from "@hookform/resolvers/zod";
import type { InvoiceDto, MemberDto, MembershipPlanDto, MembershipSubscriptionDto } from "@gym/shared";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle, Search, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { StatusBadge } from "../components/ui/StatusBadge";
import * as memberApi from "../features/members/memberApi";
import * as membershipApi from "../features/memberships/membershipApi";
import * as paymentApi from "../features/payments/paymentApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents } from "../utils/format";

const planSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  durationDays: z.coerce.number().int().positive(),
  priceCents: z.coerce.number().int().nonnegative(),
  ptIncluded: z.boolean(),
  lockerIncluded: z.boolean(),
  guestPassesIncluded: z.coerce.number().int().nonnegative(),
  accessTiming: z.string().trim(),
  gracePeriodDays: z.coerce.number().int().nonnegative(),
  freezeAllowed: z.boolean()
});

const assignSchema = z.object({
  memberId: z.string().trim().min(1, "Required"),
  planId: z.string().trim().min(1, "Required"),
  startDate: z.string()
});

type PlanFormValues = z.infer<typeof planSchema>;
type AssignFormValues = z.infer<typeof assignSchema>;

export function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [subscriptions, setSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [lastMemberId, setLastMemberId] = useState("");
  const [lastMemberLabel, setLastMemberLabel] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<MemberDto[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanDto | null>(null);

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      durationDays: 30,
      priceCents: 0,
      ptIncluded: false,
      lockerIncluded: false,
      guestPassesIncluded: 0,
      accessTiming: "",
      gracePeriodDays: 0,
      freezeAllowed: false
    }
  });

  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      memberId: "",
      planId: "",
      startDate: ""
    }
  });

  const loadPlans = async (): Promise<void> => {
    try {
      setPlans(await membershipApi.listMembershipPlans(true));
    } catch {
      toast.error("Could not load membership plans");
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  useEffect(() => {
    const query = memberSearch.trim();
    if (query.length < 2) {
      setMemberResults([]);
      setIsSearchingMembers(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void searchMembers(query);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [memberSearch]);

  const searchMembers = async (query: string): Promise<void> => {
    setIsSearchingMembers(true);
    try {
      const result = await memberApi.listMembers({ page: 1, pageSize: 8, search: query });
      setMemberResults(result.data);
    } catch {
      toast.error("Could not search members");
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const createPlan = async (values: PlanFormValues): Promise<void> => {
    try {
      const payload = {
        ...values,
        ...(values.accessTiming ? { accessTiming: values.accessTiming } : {})
      };
      if (editingPlan) {
        await membershipApi.updateMembershipPlan(editingPlan.id, payload);
      } else {
        await membershipApi.createMembershipPlan(payload);
      }
      setEditingPlan(null);
      planForm.reset();
      toast.success(editingPlan ? "Plan updated" : "Plan created");
      await loadPlans();
    } catch {
      toast.error(editingPlan ? "Could not update plan" : "Could not create plan");
    }
  };

  const editPlan = (plan: MembershipPlanDto): void => {
    setEditingPlan(plan);
    planForm.reset({
      name: plan.name,
      durationDays: plan.durationDays,
      priceCents: plan.priceCents,
      ptIncluded: plan.ptIncluded,
      lockerIncluded: plan.lockerIncluded,
      guestPassesIncluded: plan.guestPassesIncluded,
      accessTiming: plan.accessTiming ?? "",
      gracePeriodDays: plan.gracePeriodDays,
      freezeAllowed: plan.freezeAllowed
    });
  };

  const deactivatePlan = async (id: string): Promise<void> => {
    try {
      await membershipApi.deactivateMembershipPlan(id);
      toast.success("Plan deactivated");
      await loadPlans();
    } catch {
      toast.error("Could not deactivate plan");
    }
  };

  const assignSubscription = async (values: AssignFormValues): Promise<void> => {
    try {
      await membershipApi.assignSubscription(values.memberId, values.planId, values.startDate || undefined);
      setLastMemberId(values.memberId);
      setLastMemberLabel(selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName} (${selectedMember.memberCode})` : "Selected member");
      await loadMemberSubscriptionSnapshot(values.memberId);
      toast.success("Subscription assigned");
      assignForm.reset({ memberId: "", planId: "", startDate: "" });
      setMemberSearch("");
      setMemberResults([]);
      setSelectedMember(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not assign subscription"));
    }
  };

  const selectMemberForAssignment = (member: MemberDto): void => {
    setSelectedMember(member);
    setMemberSearch(`${member.firstName} ${member.lastName}`);
    setMemberResults([]);
    setLastMemberId(member.id);
    setLastMemberLabel(`${member.firstName} ${member.lastName} (${member.memberCode})`);
    assignForm.setValue("memberId", member.id, { shouldValidate: true });
    void loadMemberSubscriptionSnapshot(member.id);
  };

  const loadMemberSubscriptionSnapshot = async (memberId: string): Promise<void> => {
    try {
      const [subscriptionRows, invoiceRows] = await Promise.all([
        membershipApi.listMemberSubscriptions(memberId),
        paymentApi.listMemberInvoices(memberId)
      ]);
      setSubscriptions(subscriptionRows);
      setInvoices(invoiceRows);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load member subscription details"));
    }
  };

  const cancelSubscription = async (subscription: MembershipSubscriptionDto): Promise<void> => {
    if (!window.confirm("Cancel this member subscription? Any open invoice for this subscription will also be cancelled.")) {
      return;
    }

    try {
      await membershipApi.cancelSubscription(subscription.memberId, subscription.id);
      await loadMemberSubscriptionSnapshot(subscription.memberId);
      toast.success("Subscription cancelled");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not cancel subscription"));
    }
  };

  const currentSubscription = subscriptions.find((subscription) => subscription.status === "ACTIVE" || subscription.status === "FROZEN") ?? null;
  const currentInvoice = currentSubscription ? invoices.find((invoice) => invoice.subscriptionId === currentSubscription.id) ?? null : null;

  return (
    <section className="grid max-w-7xl min-w-0 gap-6 animate-fade-in">
      <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Plan Control</p>
        <h2 className="mt-2 text-3xl font-black text-foreground">Memberships</h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Create plans, assign subscriptions, and review member history.</p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-bold">Plans</h3>
          </div>
          <div className="divide-y divide-line">
            {plans.map((plan) => (
              <div key={plan.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="numeric">{plan.durationDays}</span> days · <span className="numeric">{formatCents(plan.priceCents)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={plan.isActive ? "ACTIVE" : "CANCELLED"} />
                  <Button variant="secondary" className="h-9 px-3" onClick={() => editPlan(plan)}>
                    Edit
                  </Button>
                  {plan.isActive ? (
                    <Button variant="secondary" className="h-9 px-3" onClick={() => void deactivatePlan(plan.id)}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4">
          <section className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold">{editingPlan ? "Edit Plan" : "New Plan"}</h3>
              {editingPlan ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3"
                  onClick={() => {
                    setEditingPlan(null);
                    planForm.reset();
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <form className="grid gap-3" onSubmit={(event) => void planForm.handleSubmit(createPlan)(event)}>
              <Input label="Name" error={planForm.formState.errors.name?.message} {...planForm.register("name")} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Duration days" type="number" {...planForm.register("durationDays")} />
                <Input label="Price cents" type="number" {...planForm.register("priceCents")} />
              </div>
              <Input label="Access timing" {...planForm.register("accessTiming")} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Guest passes" type="number" {...planForm.register("guestPassesIncluded")} />
                <Input label="Grace days" type="number" {...planForm.register("gracePeriodDays")} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <input className="h-4 w-4 rounded border-border bg-background text-primary focus-visible:focus-ring" type="checkbox" {...planForm.register("ptIncluded")} />
                PT included
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <input className="h-4 w-4 rounded border-border bg-background text-primary focus-visible:focus-ring" type="checkbox" {...planForm.register("lockerIncluded")} />
                Locker included
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <input className="h-4 w-4 rounded border-border bg-background text-primary focus-visible:focus-ring" type="checkbox" {...planForm.register("freezeAllowed")} />
                Freeze allowed
              </label>
              <Button type="submit">{editingPlan ? "Save Plan" : "Create Plan"}</Button>
            </form>
          </section>

          <section className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 text-base font-bold">Assign Subscription</h3>
            <form className="grid gap-3" onSubmit={(event) => void assignForm.handleSubmit(assignSubscription)(event)}>
              <input type="hidden" {...assignForm.register("memberId")} />
              <div className="grid gap-2">
                <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
                  <span>Search member</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                      className="h-11 w-full min-w-0 rounded-md border border-border bg-surface/70 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25"
                      placeholder="Search by name, member ID, phone, or email"
                      value={memberSearch}
                      onChange={(event) => {
                        setMemberSearch(event.target.value);
                        setSelectedMember(null);
                        assignForm.setValue("memberId", "", { shouldValidate: true });
                      }}
                    />
                  </div>
                </label>
                {assignForm.formState.errors.memberId?.message ? (
                  <p className="text-xs font-semibold text-destructive">{assignForm.formState.errors.memberId.message}</p>
                ) : null}
                {selectedMember ? (
                  <div className="flex min-w-0 items-center gap-3 rounded-md border border-primary/40 bg-secondary p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background text-primary">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">{selectedMember.firstName} {selectedMember.lastName}</p>
                      <p className="numeric truncate text-xs font-semibold text-muted-foreground">{selectedMember.memberCode} · {selectedMember.phone}</p>
                    </div>
                  </div>
                ) : null}
                {memberSearch.trim().length >= 2 && memberResults.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-background shadow-sm">
                    {memberResults.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="flex w-full min-w-0 items-center gap-3 border-b border-border px-3 py-2 text-left transition last:border-b-0 hover:bg-secondary focus-visible:focus-ring"
                        onClick={() => selectMemberForAssignment(member)}
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{member.firstName} {member.lastName}</p>
                          <p className="numeric truncate text-xs font-semibold text-muted-foreground">{member.memberCode} · {member.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
                {memberSearch.trim().length >= 2 && !isSearchingMembers && memberResults.length === 0 && !selectedMember ? (
                  <div className="rounded-md border border-border bg-background p-3">
                    <EmptyState title="No matching members" description="Try a name, member ID, phone, or email." />
                  </div>
                ) : null}
                {isSearchingMembers ? <p className="text-xs font-semibold text-muted-foreground">Searching members...</p> : null}
              </div>
              {lastMemberId ? (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Current Subscription</p>
                      <p className="mt-1 truncate text-sm font-bold text-foreground">{lastMemberLabel || "Selected member"}</p>
                    </div>
                    {currentSubscription ? <StatusBadge status={currentSubscription.status} /> : <StatusBadge status="EXPIRED" />}
                  </div>
                  {currentSubscription ? (
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="min-w-0 truncate font-bold text-foreground">{currentSubscription.planName}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Period</span>
                        <span className="numeric text-right font-semibold text-muted-foreground">{currentSubscription.startDate} to {currentSubscription.endDate}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Payment</span>
                        <span className="flex items-center gap-2">
                          {currentInvoice ? <StatusBadge status={currentInvoice.status} /> : <span className="text-xs font-bold text-warning">No invoice</span>}
                          {currentInvoice ? <span className="numeric text-xs font-bold text-muted-foreground">{formatCents(currentInvoice.remainingCents)} due</span> : null}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm font-semibold text-warning">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      No active subscription for this member.
                    </div>
                  )}
                </div>
              ) : null}
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
                <span>Plan</span>
                <select className="h-11 w-full rounded-md border border-border bg-surface/70 px-3 text-sm outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25" {...assignForm.register("planId")}>
                  <option value="">Select plan</option>
                  {plans
                    .filter((plan) => plan.isActive)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                </select>
              </label>
              <Input label="Start date" type="date" {...assignForm.register("startDate")} />
              <Button type="submit">Assign</Button>
            </form>
          </section>
        </div>
      </div>

      {lastMemberId ? (
        <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-bold">Subscription History</h3>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">{lastMemberLabel}</p>
          </div>
          <div className="divide-y divide-line overflow-x-auto">
            {subscriptions.length === 0 ? <div className="p-4"><EmptyState title="No subscription history" /></div> : null}
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="grid min-w-[860px] items-center gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(180px,1fr)_130px_220px_140px_150px_auto]">
                <span className="font-bold text-foreground">{subscription.planName}</span>
                <span><StatusBadge status={subscription.status} /></span>
                <span className="numeric text-muted-foreground">
                  {subscription.startDate} to {subscription.endDate}
                </span>
                <span className="numeric font-bold text-foreground">{formatCents(subscription.priceAtPurchaseCents)}</span>
                <span>{invoiceStatusForSubscription(invoices, subscription.id)}</span>
                <span className="text-right">
                  {subscription.status === "ACTIVE" || subscription.status === "FROZEN" ? (
                    <Button variant="secondary" className="h-9 px-3 text-destructive" onClick={() => void cancelSubscription(subscription)}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </Button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function invoiceStatusForSubscription(invoices: InvoiceDto[], subscriptionId: string) {
  const invoice = invoices.find((item) => item.subscriptionId === subscriptionId);
  if (!invoice) {
    return <span className="text-xs font-bold text-warning">No invoice</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <StatusBadge status={invoice.status} />
      <span className="numeric text-xs font-bold text-muted-foreground">{formatCents(invoice.remainingCents)} due</span>
    </span>
  );
}
