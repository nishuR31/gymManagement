import type { InvoiceDto, MemberDto, PaymentAnalyticsDto, PaymentAnalyticsRange, PaymentDto, PaymentMethod } from "@gym/shared";
import { paymentAnalyticsRanges, paymentMethods } from "@gym/shared";
import { useEffect, useMemo, useState } from "react";
import { BadgeIndianRupee, CheckCircle2, Receipt, Search, UserRound, WalletCards } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadBar } from "../components/ui/LoadBar";
import { Modal } from "../components/ui/Modal";
import { SkeletonRows } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import * as memberApi from "../features/members/memberApi";
import * as paymentApi from "../features/payments/paymentApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents, formatDateTime } from "../utils/format";
import { isAdminRole } from "../utils/roles";

export function PaymentsPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [range, setRange] = useState<PaymentAnalyticsRange>("daily");
  const [analytics, setAnalytics] = useState<PaymentAnalyticsDto | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<MemberDto[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [memberInvoices, setMemberInvoices] = useState<InvoiceDto[]>([]);
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<PaymentDto | null>(null);

  const loadAnalytics = async (): Promise<void> => {
    if (!isAdminRole(role)) {
      setAnalytics(null);
      return;
    }

    try {
      setAnalytics(await paymentApi.getPaymentAnalytics(range));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load revenue analytics"));
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, [range, role]);

  useEffect(() => {
    const query = memberSearch.trim();
    if (selectedMember && query === memberLabel(selectedMember)) {
      setMemberResults([]);
      setIsSearchingMembers(false);
      return;
    }

    if (query.length < 2) {
      setMemberResults([]);
      setIsSearchingMembers(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void searchMembers(query);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [memberSearch, selectedMember]);

  const searchMembers = async (query: string): Promise<void> => {
    setIsSearchingMembers(true);
    try {
      const result = await memberApi.listMembers({ page: 1, pageSize: 8, search: query });
      setMemberResults(result.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not search members"));
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const loadMemberFinancials = async (member: MemberDto): Promise<void> => {
    setLoading(true);
    try {
      const [paymentRows, invoiceRows] = await Promise.all([
        paymentApi.listMemberPayments(member.id),
        paymentApi.listMemberInvoices(member.id)
      ]);
      setPayments(paymentRows);
      setMemberInvoices(invoiceRows);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load member payments"));
    } finally {
      setLoading(false);
    }
  };

  const selectMember = (member: MemberDto): void => {
    setSelectedMember(member);
    setMemberSearch(memberLabel(member));
    setMemberResults([]);
    setInvoice(null);
    void loadMemberFinancials(member);
  };

  const refreshSelectedMember = async (): Promise<void> => {
    if (selectedMember) {
      await loadMemberFinancials(selectedMember);
    }
  };

  const loadInvoice = async (): Promise<void> => {
    if (!invoiceId.trim()) {
      return;
    }
    setLoading(true);
    try {
      setInvoice(await paymentApi.getInvoice(invoiceId.trim()));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load invoice"));
    } finally {
      setLoading(false);
    }
  };

  const total = analytics?.totalRevenueCents ?? 0;
  const pendingInvoices = useMemo(
    () => memberInvoices.filter((item) => item.remainingCents > 0 && (item.status === "PENDING" || item.status === "PARTIALLY_PAID")),
    [memberInvoices]
  );
  const totalPendingCents = pendingInvoices.reduce((sum, item) => sum + item.remainingCents, 0);

  return (
    <section className="grid max-w-7xl min-w-0 gap-6 animate-fade-in">
      <div className="bg-card grid gap-4 rounded-lg border border-border p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Revenue Desk</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Payments</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">Invoices, refunds, and revenue analytics</p>
        </div>
        <div className="flex max-w-full overflow-x-auto rounded-md border border-border bg-background p-1">
          {paymentAnalyticsRanges.map((item) => (
            <button
              key={item}
              className={`h-9 shrink-0 rounded px-3 text-sm font-bold capitalize ${range === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Revenue">
          {isAdminRole(role) ? (
            <>
              <p className="numeric text-4xl font-black text-foreground">{formatCents(total)}</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.buckets ?? []}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} tickFormatter={(value) => formatCents(Number(value)).replace(".00", "")} width={72} />
                    <Tooltip
                      cursor={{ fill: "color-mix(in srgb, hsl(var(--primary)) 8%, transparent)" }}
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                      formatter={(value) => formatCents(Number(value))}
                    />
                    <Bar dataKey="revenueCents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyState title="Revenue analytics are admin-only" description="Staff can still search members and record invoice payments below." />
          )}
        </Card>

        <Card title="Member Lookup">
          <div className="grid gap-4">
            <div className="relative">
              <Input
                label="Search member"
                placeholder="Name, code, phone, or email"
                value={memberSearch}
                onChange={(event) => {
                  setMemberSearch(event.target.value);
                  setSelectedMember(null);
                }}
              />
              <Search className="pointer-events-none absolute right-3 top-10 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {(memberResults.length > 0 || isSearchingMembers) && (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-md border border-border bg-card p-2 shadow-sm">
                  {isSearchingMembers ? <p className="px-3 py-2 text-sm font-semibold text-muted-foreground">Searching...</p> : null}
                  {memberResults.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-surface-hover focus-visible:focus-ring"
                      onClick={() => selectMember(member)}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-hover text-foreground">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-foreground">{member.firstName} {member.lastName}</span>
                        <span className="numeric block truncate text-xs font-semibold text-muted-foreground">{member.memberCode} · {member.phone}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedMember ? (
              <div className="rounded-md border border-primary/40 bg-primary/10 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-foreground">Selected member</p>
                <p className="mt-1 font-bold text-foreground">{selectedMember.firstName} {selectedMember.lastName}</p>
                <p className="numeric text-xs font-semibold text-muted-foreground">{selectedMember.memberCode}</p>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-surface/70 p-3 text-sm font-semibold text-muted-foreground">
                Search and select a member to load pending dues and payment history.
              </div>
            )}

            <div className="grid gap-3 border-t border-border pt-4">
              <Input label="Invoice ID lookup" placeholder="Optional direct invoice ID" value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} />
              <Button variant="secondary" onClick={() => void loadInvoice()}>
                Load Invoice
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]">
        <Card
          title="Pending Dues"
          action={
            selectedMember ? (
              <span className="numeric text-sm font-black text-foreground">{formatCents(totalPendingCents)}</span>
            ) : null
          }
        >
          {loading ? <SkeletonRows /> : null}
          {!loading && !selectedMember ? (
            <EmptyState title="Select a member" description="Pending dues will appear here after member search." />
          ) : null}
          {!loading && selectedMember && pendingInvoices.length === 0 ? (
            <EmptyState title="No pending dues" description="This member has no open invoice balance." />
          ) : null}
          <div className="grid gap-3">
            {pendingInvoices.map((item) => (
              <PendingInvoiceCard
                key={item.id}
                invoice={item}
                onView={() => setInvoice(item)}
                onPay={() => {
                  setInvoice(item);
                  setPaymentOpen(true);
                }}
              />
            ))}
          </div>
        </Card>

        <Card title="Member Payment History">
          {loading ? <SkeletonRows /> : null}
          {!loading && !selectedMember ? <EmptyState title="No member selected" description="Search by member name, code, phone, or email." /> : null}
          {!loading && selectedMember && payments.length === 0 ? <EmptyState title="No payments yet" description="Recorded payments for this member will appear here." /> : null}
          <div className="grid gap-3">
            {payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} canRefund={isAdminRole(role)} onRefund={() => setRefundTarget(payment)} />
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Invoice"
        action={
          invoice && invoice.remainingCents > 0 ? (
              <Button className="h-9 px-3" onClick={() => setPaymentOpen(true)}>
                Record Payment
              </Button>
          ) : null
        }
      >
        {invoice ? <InvoicePanel invoice={invoice} canRefund={isAdminRole(role)} onRefund={setRefundTarget} /> : <EmptyState title="No invoice selected" description="Select a pending due or load an invoice by ID." />}
      </Card>

      <RecordPaymentModal
        invoice={invoice}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSaved={(next) => {
          setInvoice(next);
          setPaymentOpen(false);
          void refreshSelectedMember();
          void loadAnalytics();
        }}
      />
      <RefundModal
        payment={refundTarget}
        onClose={() => setRefundTarget(null)}
        onSaved={(next) => {
          setInvoice(next);
          setRefundTarget(null);
          void refreshSelectedMember();
          void loadAnalytics();
        }}
      />
    </section>
  );
}

function InvoicePanel({ invoice, canRefund, onRefund }: { invoice: InvoiceDto; canRefund: boolean; onRefund: (payment: PaymentDto) => void }) {
  const progress = invoice.amountDueCents <= 0 ? 100 : Math.min(invoice.amountDueCents, invoice.amountPaidCents);
  const tone = invoice.status === "PAID" ? "success" : invoice.status === "PARTIALLY_PAID" ? "warning" : "brand";

  return (
      <div className="grid min-w-0 gap-4">
      <div className="rounded-md border border-border bg-surface/80 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <StatusBadge status={invoice.status} />
          <span className="numeric text-xs font-bold text-muted-foreground">{formatCents(invoice.amountPaidCents)} / {formatCents(invoice.amountDueCents)}</span>
        </div>
        <LoadBar value={progress} max={Math.max(1, invoice.amountDueCents)} label="Payment progress" maxLabel={formatCents(invoice.amountDueCents)} tone={tone} />
      </div>
      <div className="grid min-w-0 gap-3 text-sm md:grid-cols-4">
        <Metric label="Due" value={formatCents(invoice.amountDueCents)} />
        <Metric label="Paid" value={formatCents(invoice.amountPaidCents)} />
        <Metric label="Remaining" value={formatCents(invoice.remainingCents)} />
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
          <div className="mt-1"><StatusBadge status={invoice.status} /></div>
        </div>
      </div>
      <div className="grid gap-3">
        {invoice.payments.map((payment) => (
          <PaymentRow key={payment.id} payment={payment} canRefund={canRefund} onRefund={() => onRefund(payment)} />
        ))}
      </div>
    </div>
  );
}

function PendingInvoiceCard({ invoice, onView, onPay }: { invoice: InvoiceDto; onView: () => void; onPay: () => void }) {
  const progress = invoice.amountDueCents <= 0 ? 100 : Math.min(invoice.amountDueCents, invoice.amountPaidCents);

  return (
    <div className="rounded-md border border-border bg-surface/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/70">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/15 text-primary-foreground">
            <Receipt className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={invoice.status} />
              <span className="numeric truncate text-xs font-bold text-muted-foreground">{invoice.id.slice(0, 8)}</span>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Remaining due</p>
            <p className="numeric text-2xl font-black text-foreground">{formatCents(invoice.remainingCents)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Due date</p>
          <p className="numeric text-sm font-bold text-muted-foreground">{new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="mt-4">
        <LoadBar value={progress} max={Math.max(1, invoice.amountDueCents)} label="Paid" maxLabel={formatCents(invoice.amountDueCents)} tone={invoice.status === "PARTIALLY_PAID" ? "warning" : "brand"} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="h-9 px-3" onClick={onPay}>
          <BadgeIndianRupee className="h-4 w-4" aria-hidden="true" />
          Record Payment
        </Button>
        <Button variant="secondary" className="h-9 px-3" onClick={onView}>
          <WalletCards className="h-4 w-4" aria-hidden="true" />
          View Invoice
        </Button>
      </div>
    </div>
  );
}

function PaymentRow({ payment, canRefund, onRefund }: { payment: PaymentDto; canRefund: boolean; onRefund: () => void }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background p-3 transition hover:border-primary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="numeric font-bold text-foreground">{formatCents(payment.amountCents)}</p>
          <p className="truncate text-xs font-semibold text-muted-foreground">{payment.method} · {formatDateTime(payment.paidAt)}</p>
        </div>
        {canRefund && payment.refundableCents > 0 ? (
          <Button variant="secondary" className="h-9 px-3" onClick={onRefund}>
            Refund
          </Button>
        ) : null}
      </div>
      {payment.refunds.length > 0 ? (
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
          {payment.refunds.map((refund) => (
            <div key={refund.id} className="flex justify-between gap-2">
              <span>{refund.reason}</span>
              <span className="numeric font-bold">-{formatCents(refund.amountCents)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecordPaymentModal({ invoice, open, onClose, onSaved }: { invoice: InvoiceDto | null; open: boolean; onClose: () => void; onSaved: (invoice: InvoiceDto) => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [isSaving, setIsSaving] = useState(false);
  const amountCents = Math.round(Number(amount || "0") * 100);
  const remainingAfterPayment = invoice ? invoice.remainingCents - amountCents : 0;
  const exceedsRemaining = invoice ? amountCents > invoice.remainingCents : false;
  const clearsBalance = invoice ? amountCents === invoice.remainingCents : false;

  useEffect(() => {
    if (invoice && open) {
      setAmount((invoice.remainingCents / 100).toFixed(2));
    }
  }, [invoice, open]);

  const submit = async (): Promise<void> => {
    if (!invoice) return;
    setIsSaving(true);
    try {
      const next = await paymentApi.recordPayment(invoice.id, { amountCents: Math.round(Number(amount) * 100), method });
      toast.success(next.status === "PAID" ? "Dues marked paid" : "Payment recorded");
      onSaved(next);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Payment could not be recorded"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Record Payment" open={open && !!invoice} onClose={onClose}>
      <div className="grid gap-3">
        {invoice ? (
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Remaining balance</p>
            <p className="numeric mt-1 text-3xl font-black text-foreground">{formatCents(invoice.remainingCents)}</p>
            <p className={`numeric mt-2 text-sm font-bold ${exceedsRemaining ? "text-destructive" : "text-muted-foreground"}`}>
              After this payment: {formatCents(Math.max(0, remainingAfterPayment))}
            </p>
            {clearsBalance ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-state-success/40 bg-state-success/10 px-2 py-1 text-xs font-bold text-state-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                This will mark the invoice as PAID
              </p>
            ) : null}
          </div>
        ) : null}
        <Input label="Amount" type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          <span>Method</span>
          <select className="h-11 w-full rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <Button onClick={() => void submit()} disabled={exceedsRemaining || amountCents <= 0} isLoading={isSaving}>Save Payment</Button>
      </div>
    </Modal>
  );
}

function RefundModal({ payment, onClose, onSaved }: { payment: PaymentDto | null; onClose: () => void; onSaved: (invoice: InvoiceDto) => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (payment) {
      setAmount((payment.refundableCents / 100).toFixed(2));
      setReason("");
    }
  }, [payment]);

  const submit = async (): Promise<void> => {
    if (!payment) return;
    try {
      const next = await paymentApi.refundPayment(payment.id, { amountCents: Math.round(Number(amount) * 100), reason });
      toast.success("Refund recorded");
      onSaved(next);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Refund could not be recorded"));
    }
  };

  return (
    <Modal title="Refund Payment" open={!!payment} onClose={onClose}>
      <div className="grid gap-3">
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Refundable</p>
          <p className="numeric mt-1 text-2xl font-black text-foreground">{formatCents(payment?.refundableCents ?? 0)}</p>
        </div>
        <Input label="Amount" type="number" step="0.01" max={payment ? payment.refundableCents / 100 : undefined} value={amount} onChange={(event) => setAmount(event.target.value)} />
        <Input label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button onClick={() => void submit()} disabled={!reason.trim()}>
          Record Refund
        </Button>
      </div>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="numeric mt-1 font-bold text-foreground">{value}</p>
    </div>
  );
}

function memberLabel(member: MemberDto): string {
  return `${member.firstName} ${member.lastName} (${member.memberCode})`;
}
