import type { AuditLogDto, DashboardSummaryDto, LowStockProductDto, MembershipSubscriptionDto, NotificationDto, PaymentDto, ProductDto, ProductOrderDto } from "@gym/shared";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, AlertTriangle, Boxes, CalendarClock, Clock3, CreditCard, Dumbbell, Receipt, TrendingUp, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadBar } from "../components/ui/LoadBar";
import { SkeletonRows } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import { getDashboardSummary } from "../features/dashboard/dashboardApi";
import * as inventoryApi from "../features/inventory/inventoryApi";
import * as memberApi from "../features/members/memberApi";
import * as membershipApi from "../features/memberships/membershipApi";
import * as notificationApi from "../features/notifications/notificationApi";
import * as orderApi from "../features/orders/orderApi";
import * as paymentApi from "../features/payments/paymentApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents, formatDateTime, formatRelativeTime } from "../utils/format";

export function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "MEMBER") {
      setIsLoading(false);
      return;
    }

    async function loadSummary(): Promise<void> {
      try {
        setSummary(await getDashboardSummary());
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Could not load dashboard"));
      } finally {
        setIsLoading(false);
      }
    }

    void loadSummary();
  }, [user?.role]);

  if (user?.role === "MEMBER") {
    return <MemberDashboard userName={`${user.firstName} ${user.lastName}`} />;
  }

  return (
    <section className="grid max-w-7xl min-w-0 gap-6 animate-fade-in">
      <div className="overflow-hidden rounded-lg border border-border text-foreground shadow-sm dark-band-gradient">
        <div
          className="p-5 md:p-6"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, hsl(var(--primary)) 34%, transparent) 0%, transparent 42%), linear-gradient(180deg, color-mix(in srgb, hsl(var(--card)) 9%, transparent) 0%, transparent 100%)"
          }}
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-md border border-brand/35 bg-panel/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground">
                <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
                Live Operations
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-foreground md:text-4xl">Dashboard</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                Live operational summary for the gym floor, front desk, revenue, dues, inventory, and recent activity.
              </p>
            </div>
            <div className="w-fit rounded-lg border border-border bg-panel/10 px-4 py-3 xl:justify-self-end">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary-foreground">Refresh state</p>
              <p className="mt-1 text-sm font-bold text-foreground">{isLoading ? "Loading live metrics" : "Metrics synced"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} title="Currently In Gym" value={summary?.membersCurrentlyInGym ?? 0} loading={isLoading} tone="brand" primary />
        <MetricCard icon={CreditCard} title="Today's Revenue" value={summary?.todaysRevenueCents ?? 0} formatter={formatCents} loading={isLoading} tone="warning" primary />
        <MetricCard icon={Activity} title="Today's Attendance" value={summary?.todaysAttendance ?? 0} loading={isLoading} tone="success" />
        <MetricCard icon={TrendingUp} title="Monthly Revenue" value={summary?.monthlyRevenueCents ?? 0} formatter={formatCents} loading={isLoading} tone="brand" />
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <Card title="Pending Dues" className="hover:-translate-y-1 hover:border-brand">
          {isLoading ? <SkeletonRows rows={2} /> : null}
          {!isLoading ? (
            <>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-accent-soft text-destructive">
                <Receipt className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="numeric text-3xl font-black text-foreground">{formatCents(summary?.pendingDuesCents ?? 0)}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground"><span className="numeric">{summary?.pendingDuesCount ?? 0}</span> open invoices</p>
            </>
          ) : null}
        </Card>
        <Card title="Expiring Soon" className="hover:-translate-y-1 hover:border-brand">
          {isLoading ? <SkeletonRows rows={2} /> : null}
          {!isLoading ? (
            <>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-warning-soft text-warning">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="numeric text-3xl font-black text-foreground">{summary?.membershipsExpiringSoon.length ?? 0}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">Memberships inside 30 days</p>
            </>
          ) : null}
        </Card>
        <Card title="Low Stock Alerts" className="hover:-translate-y-1 hover:border-brand">
          {isLoading ? <SkeletonRows rows={2} /> : null}
          {!isLoading ? (
            <>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-accent-soft text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="numeric text-3xl font-black text-foreground">{summary?.lowStockAlerts.length ?? 0}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">Products at or below reorder point</p>
            </>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Recent Payments">
          {isLoading ? <SkeletonRows /> : null}
          {!isLoading && (summary?.recentPayments.length ?? 0) === 0 ? <EmptyState title="No recent payments" /> : null}
          <div className="grid gap-3">
            {summary?.recentPayments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}
          </div>
        </Card>

        <Card title="Low Stock">
          {isLoading ? <SkeletonRows /> : null}
          {!isLoading && (summary?.lowStockAlerts.length ?? 0) === 0 ? <EmptyState title="No low-stock products" /> : null}
          <div className="grid gap-3">
            {summary?.lowStockAlerts.map((product) => <LowStockRow key={product.id} product={product} />)}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Memberships Expiring Soon">
          {isLoading ? <SkeletonRows /> : null}
          {!isLoading && (summary?.membershipsExpiringSoon.length ?? 0) === 0 ? <EmptyState title="No memberships expiring soon" /> : null}
          <div className="grid gap-3">
            {summary?.membershipsExpiringSoon.map((subscription) => <SubscriptionRow key={subscription.id} subscription={subscription} />)}
          </div>
        </Card>

        <Card title="Recent Activity">
          {isLoading ? <SkeletonRows /> : null}
          {!isLoading && (summary?.recentActivity.length ?? 0) === 0 ? <EmptyState title="No recent activity" /> : null}
          <div className="grid gap-3">
            {summary?.recentActivity.map((activity) => <ActivityRow key={activity.id} activity={activity} />)}
          </div>
        </Card>
      </div>
    </section>
  );
}

function MemberDashboard({ userName }: { userName: string }) {
  const [subscriptions, setSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [orders, setOrders] = useState<ProductOrderDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const member = await memberApi.getCurrentMember();
        const [subscriptionRows, paymentRows, orderRows, productRows, notificationRows] = await Promise.all([
          membershipApi.listMemberSubscriptions(member.id).catch(() => []),
          paymentApi.listMemberPayments(member.id).catch(() => []),
          orderApi.listOrders({ pageSize: 5 }).then((response) => response.data).catch(() => []),
          inventoryApi.listProducts().catch(() => []),
          notificationApi.listNotifications({ pageSize: 5 }).then((response) => response.data).catch(() => [])
        ]);
        setSubscriptions(subscriptionRows);
        setPayments(paymentRows);
        setOrders(orderRows);
        setProducts(productRows);
        setNotifications(notificationRows);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Could not load member dashboard"));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const activeSubscription = subscriptions.find((subscription) => subscription.status === "ACTIVE") ?? subscriptions[0] ?? null;
  const membership = memberMembershipState(activeSubscription);
  const recentPaymentTotal = payments.slice(0, 3).reduce((total, payment) => total + payment.amountCents, 0);

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="overflow-hidden rounded-lg border border-border text-foreground shadow-sm dark-band-gradient">
        <div className="p-5 md:p-6">
          <p className="inline-flex items-center gap-2 rounded-md border border-brand/35 bg-panel/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground">
            <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
            Member Portal
          </p>
          <h2 className="mt-4 text-3xl font-black text-foreground md:text-5xl">Welcome, {userName}</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">Membership, payments, product bookings, and gym alerts in one place.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:-translate-y-1 hover:border-brand">
          <PortalMetric icon={WalletCards} title="Membership" value={membership.label} copy={activeSubscription?.planName ?? "No active plan"} tone={membership.tone} />
        </Card>
        <Card className="hover:-translate-y-1 hover:border-brand">
          <PortalMetric icon={CalendarClock} title="Days Remaining" value={membership.daysRemaining.toString()} copy={activeSubscription ? `Ends ${formatDateTime(activeSubscription.endDate)}` : "Contact front desk"} tone="warning" />
        </Card>
        <Card className="hover:-translate-y-1 hover:border-brand">
          <PortalMetric icon={CreditCard} title="Recent Payments" value={formatCents(recentPaymentTotal)} copy={`${payments.length} payment records`} tone="brand" />
        </Card>
        <Card className="hover:-translate-y-1 hover:border-brand">
          <PortalMetric icon={Boxes} title="Products Available" value={products.length.toString()} copy={`${orders.length} recent bookings`} tone="success" />
        </Card>
      </div>

      {membership.label === "Expiring Soon" ? (
        <div className="rounded-lg border border-warning bg-warning-soft p-4 text-sm font-bold text-warning">
          Your membership is expiring soon. Please renew at the front desk to avoid check-in interruption.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Quick Actions">
          <div className="grid gap-2">
            <a className="rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:border-brand focus-visible:focus-ring" href="/dashboard/products">View Products</a>
            <a className="rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:border-brand focus-visible:focus-ring" href="/dashboard/my-membership">View Membership</a>
            <a className="rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:border-brand focus-visible:focus-ring" href="/dashboard/my-orders">View Orders</a>
            <a className="rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:border-brand focus-visible:focus-ring" href="/dashboard/my-payments">View Payments</a>
          </div>
        </Card>
        <Card title="Recent Orders">
          {loading ? <SkeletonRows rows={3} /> : null}
          {!loading && orders.length === 0 ? <EmptyState title="No orders yet" /> : null}
          <div className="grid gap-2">
            {orders.slice(0, 4).map((order) => (
              <div key={order.id} className="rounded-md border border-border bg-background p-3">
                <p className="font-bold text-foreground">{order.productName}</p>
                <p className="numeric mt-1 text-xs text-muted-foreground">{order.orderCode} · {formatCents(order.amountCents)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Important Notifications">
          {loading ? <SkeletonRows rows={3} /> : null}
          {!loading && notifications.length === 0 ? <EmptyState title="No notifications" /> : null}
          <div className="grid gap-2">
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="rounded-md border border-border bg-background p-3">
                <p className="font-bold text-foreground">{notification.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function PortalMetric({ icon: Icon, title, value, copy, tone }: { icon: LucideIcon; title: string; value: string; copy: string; tone: "brand" | "success" | "warning" | "danger" }) {
  const tones = {
    brand: "bg-line-faint text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-accent-soft text-destructive"
  };

  return (
    <div>
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-md shadow-sm ${tones[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <h3 className="numeric mt-2 text-2xl font-black text-foreground">{value}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}

function memberMembershipState(subscription: MembershipSubscriptionDto | null): { label: string; daysRemaining: number; tone: "brand" | "success" | "warning" | "danger" } {
  if (!subscription) {
    return { label: "No Plan", daysRemaining: 0, tone: "danger" };
  }
  const daysRemaining = Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0 || subscription.status === "EXPIRED") {
    return { label: "Expired", daysRemaining, tone: "danger" };
  }
  if (daysRemaining <= 7) {
    return { label: "Expiring Soon", daysRemaining, tone: "warning" };
  }
  return { label: "Active", daysRemaining, tone: "success" };
}

function MetricCard({
  icon: Icon,
  title,
  value,
  formatter,
  loading,
  tone,
  primary = false
}: {
  icon: LucideIcon;
  title: string;
  value: number;
  formatter?: (value: number) => string;
  loading: boolean;
  tone: "brand" | "success" | "warning";
  primary?: boolean;
}) {
  const animated = useCountUp(value, !loading);
  const displayValue = formatter ? formatter(animated) : Math.round(animated).toString();
  const tones = {
    brand: "bg-line-faint text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning"
  };

  return (
    <Card className="group min-w-0 overflow-hidden hover:-translate-y-1 hover:border-brand">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground sm:text-sm">{title}</p>
          {loading ? (
            <div className="mt-4"><SkeletonRows rows={2} /></div>
          ) : (
            <p className={`mt-4 numeric break-words font-black leading-none text-foreground ${primary ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}`}>{displayValue}</p>
          )}
        </div>
        <div className={`grid shrink-0 place-items-center rounded-md transition group-hover:scale-105 ${primary ? "h-14 w-14" : "h-11 w-11"} ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

function useCountUp(value: number, enabled: boolean) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (hasAnimated.current) {
      setDisplay(value);
      return;
    }

    hasAnimated.current = true;
    const startedAt = performance.now();
    const duration = 800;
    let frame = 0;

    const tick = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, value]);

  return display;
}

function PaymentRow({ payment }: { payment: PaymentDto }) {
  return (
    <div className="rounded-md border border-border bg-surface/80 p-3 transition hover:border-brand">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="numeric font-bold text-foreground">{formatCents(payment.amountCents)}</p>
          <p className="truncate text-xs font-semibold text-muted-foreground">{payment.method} · {formatRelativeTime(payment.paidAt)}</p>
        </div>
        <span className="numeric rounded-md bg-line-faint px-2 py-1 text-xs text-muted-foreground">{payment.invoiceId.slice(0, 8)}</span>
      </div>
    </div>
  );
}

function LowStockRow({ product }: { product: LowStockProductDto }) {
  return (
    <div className="rounded-md border border-border bg-surface/80 p-3 transition hover:border-brand">
      <div className="mb-2 flex justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-2 font-bold text-foreground"><Boxes className="h-4 w-4 text-primary" aria-hidden="true" />{product.name}</span>
        <span className="numeric font-semibold text-muted-foreground">{product.currentStock} left</span>
      </div>
      <LoadBar value={product.currentStock} max={Math.max(1, product.reorderThreshold)} tone="danger" />
    </div>
  );
}

function SubscriptionRow({ subscription }: { subscription: MembershipSubscriptionDto }) {
  return (
    <div className="rounded-md border border-border bg-surface/80 p-3 transition hover:border-brand">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">{subscription.planName}</p>
          <p className="text-xs font-semibold text-muted-foreground">
            Member <span className="numeric">{subscription.memberId.slice(0, 8)}</span> · Ends {formatDateTime(subscription.endDate)}
          </p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: AuditLogDto }) {
  return (
    <div className="rounded-md border border-border bg-surface/80 p-3 transition hover:border-brand">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-foreground">{activity.action}</p>
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{formatRelativeTime(activity.createdAt)}</p>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{activity.entity ?? "System"} {activity.entityId ? <span className="numeric">· {activity.entityId}</span> : ""}</p>
    </div>
  );
}
