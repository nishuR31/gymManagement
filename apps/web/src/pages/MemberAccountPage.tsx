import type { GymInfoDto, MemberDietPlanDto, MemberDto, MemberWorkoutPlanDto, MembershipSubscriptionDto, PaymentDto, ProductOrderDto } from "@gym/shared";
import { Beef, CalendarClock, Clock3, CreditCard, Dumbbell, MapPin, Phone, UserRound, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { APP_NAME } from "../utils/env";
import { toast } from "sonner";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusBadge } from "../components/ui/StatusBadge";
import * as memberApi from "../features/members/memberApi";
import * as membershipApi from "../features/memberships/membershipApi";
import * as orderApi from "../features/orders/orderApi";
import * as paymentApi from "../features/payments/paymentApi";
import * as settingsApi from "../features/settings/settingsApi";
import * as staffApi from "../features/staff/staffApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents, formatDateTime } from "../utils/format";

type MemberAccountMode = "membership" | "payments" | "profile" | "plans";

export function MemberAccountPage({ mode }: { mode: MemberAccountMode }) {
  const [member, setMember] = useState<MemberDto | null>(null);
  const [subscriptions, setSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [orders, setOrders] = useState<ProductOrderDto[]>([]);
  const [workouts, setWorkouts] = useState<MemberWorkoutPlanDto[]>([]);
  const [diets, setDiets] = useState<MemberDietPlanDto[]>([]);
  const [gymInfo, setGymInfo] = useState<GymInfoDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const self = await memberApi.getCurrentMember();
        setMember(self);
        const [subscriptionRows, paymentRows, orderRows, workoutRows, dietRows, info] = await Promise.all([
          membershipApi.listMemberSubscriptions(self.id).catch(() => []),
          paymentApi.listMemberPayments(self.id).catch(() => []),
          orderApi.listOrders({ pageSize: 10 }).then((response) => response.data).catch(() => []),
          staffApi.listMemberWorkouts(self.id).catch(() => []),
          staffApi.listMemberDiets(self.id).catch(() => []),
          settingsApi.getGymInfo().catch(() => null)
        ]);
        setSubscriptions(subscriptionRows);
        setPayments(paymentRows);
        setOrders(orderRows);
        setWorkouts(workoutRows);
        setDiets(dietRows);
        setGymInfo(info);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Could not load member account"));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const activeSubscription = subscriptions.find((subscription) => subscription.status === "ACTIVE") ?? subscriptions[0] ?? null;
  const membershipStatus = useMemo(() => membershipState(activeSubscription), [activeSubscription]);

  if (loading) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm font-bold text-muted-foreground shadow-sm">Loading account</div>;
  }

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{mode === "membership" ? "My Membership" : mode === "payments" ? "My Payments" : mode === "plans" ? "My Plans" : "My Profile"}</p>
        <h2 className="mt-2 text-3xl font-black text-foreground">{member ? `${member.firstName} ${member.lastName}` : "Member Account"}</h2>
        <p className="numeric mt-1 text-sm font-black text-primary">{member?.memberCode}</p>
      </div>

      {mode === "membership" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-foreground">Current Membership</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">Plan dates and renewal state</p>
              </div>
              <StatusBadge status={membershipStatus.status} />
            </div>
            {activeSubscription ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Detail label="Current plan" value={activeSubscription.planName} />
                <Detail label="Plan amount" value={formatCents(activeSubscription.priceAtPurchaseCents)} numeric />
                <Detail label="Start date" value={formatDateTime(activeSubscription.startDate)} />
                <Detail label="Expiry date" value={formatDateTime(activeSubscription.endDate)} />
                <Detail label="Days remaining" value={membershipStatus.daysRemaining.toString()} numeric />
                <Detail label="Coach status" value={activeSubscription.planName.toLowerCase().includes("coach") ? "Coach add-on active" : "No coach add-on"} />
              </div>
            ) : (
              <EmptyState icon={WalletCards} title="No active membership" description="Contact the front desk to activate a plan." />
            )}
          </section>
          <section className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h3 className="text-xl font-black text-foreground">Recent Orders</h3>
            <div className="mt-4 grid gap-2">
              {orders.length === 0 ? <EmptyState icon={CalendarClock} title="No orders yet" /> : null}
              {orders.slice(0, 4).map((order) => (
                <div key={order.id} className="rounded-md border border-border bg-background p-3">
                  <p className="font-bold text-foreground">{order.productName}</p>
                  <p className="numeric mt-1 text-xs text-muted-foreground">{order.orderCode} · {formatCents(order.amountCents)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {mode === "payments" ? (
        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h3 className="text-xl font-black text-foreground">Payment History</h3>
          </div>
          {payments.length === 0 ? <div className="p-4"><EmptyState icon={CreditCard} title="No payments recorded" description="Offline payments recorded by admin will appear here." /></div> : null}
          <div className="overflow-x-auto">
            <table className="min-w-190 w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="numeric px-4 py-3 font-black text-primary">{payment.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(payment.paidAt)}</td>
                    <td className="numeric px-4 py-3 text-foreground">{formatCents(payment.amountCents)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{payment.method}</td>
                    <td className="px-4 py-3"><StatusBadge status="PAID" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {mode === "plans" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-xl font-black text-foreground"><Dumbbell className="h-5 w-5 text-primary" aria-hidden="true" />Workout Plans</h3>
            <div className="mt-4 grid gap-3">
              {workouts.length === 0 ? <EmptyState icon={Dumbbell} title="No workout plans assigned" description="Assigned workout plans will appear here." /> : null}
              {workouts.map((plan) => (
                <div key={plan.id} className="rounded-md border border-border bg-background p-3">
                  <p className="font-bold text-foreground">Starts {formatDateTime(plan.startDate)}</p>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {plan.exercises.map((exercise, index) => (
                      <div key={`${plan.id}-${index}`} className="flex justify-between gap-3">
                        <span>{exercise.name}</span>
                        <span className="numeric font-semibold">{exercise.sets} x {exercise.reps}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-xl font-black text-foreground"><Beef className="h-5 w-5 text-primary" aria-hidden="true" />Diet Plans</h3>
            <div className="mt-4 grid gap-3">
              {diets.length === 0 ? <EmptyState icon={Beef} title="No diet plans assigned" description="Assigned diet plans will appear here." /> : null}
              {diets.map((plan) => (
                <div key={plan.id} className="rounded-md border border-border bg-background p-3">
                  <p className="font-bold text-foreground">Starts {formatDateTime(plan.startDate)}</p>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {plan.meals.map((meal, index) => (
                      <div key={`${plan.id}-${index}`} className="flex justify-between gap-3">
                        <span>{meal.name}</span>
                        <span className="numeric font-semibold">{meal.calories} cal</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {mode === "profile" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
              <UserRound className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Detail label="Name" value={member ? `${member.firstName} ${member.lastName}` : "-"} />
              <Detail label="Member ID" value={member?.memberCode ?? "-"} numeric />
              <Detail label="Phone" value={member?.phone ?? "-"} numeric />
              <Detail label="Email" value={member?.email ?? "-"} />
              <Detail label="Join date" value={member ? formatDateTime(member.joinedAt) : "-"} />
              <Detail label="Status" value={member?.status ?? "-"} />
            </div>
          </section>
          <GymInfoCard info={gymInfo} />
        </div>
      ) : null}
    </section>
  );
}

function GymInfoCard({ info }: { info: GymInfoDto | null }) {
  const hours = Object.entries(info?.businessHours ?? {});

  return (
    <section className="bg-card rounded-lg border border-border p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Gym Info</p>
      <h3 className="mt-2 text-xl font-black text-foreground">{info?.name ?? APP_NAME}</h3>
      <div className="mt-4 grid gap-3 text-sm">
        <InfoLine icon={MapPin} value={info?.address || "Address not set"} />
        <InfoLine icon={Phone} value={[info?.phone, info?.email].filter(Boolean).join(" · ") || "Contact not set"} />
      </div>
      <div className="mt-4 rounded-md border border-border bg-background p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
          <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
          Timings
        </p>
        <div className="grid gap-1 text-xs font-semibold text-muted-foreground">
          {hours.length === 0 ? <p>Hours not set</p> : null}
          {hours.map(([day, value]) => (
            <div key={day} className="flex justify-between gap-3">
              <span className="capitalize">{day}</span>
              <span className="numeric text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoLine({ icon: Icon, value }: { icon: typeof MapPin; value: string }) {
  return (
    <div className="flex gap-2 rounded-md border border-border bg-background p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="font-semibold leading-5 text-muted-foreground">{value}</span>
    </div>
  );
}

function Detail({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 font-bold text-foreground ${numeric ? "numeric" : ""}`}>{value}</p>
    </div>
  );
}

function membershipState(subscription: MembershipSubscriptionDto | null): { status: "ACTIVE" | "EXPIRED" | "EXPIRING_SOON"; daysRemaining: number } {
  if (!subscription) {
    return { status: "EXPIRED", daysRemaining: 0 };
  }
  const today = new Date();
  const end = new Date(subscription.endDate);
  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0 || subscription.status === "EXPIRED") {
    return { status: "EXPIRED", daysRemaining };
  }
  if (daysRemaining <= 7) {
    return { status: "EXPIRING_SOON", daysRemaining };
  }
  return { status: "ACTIVE", daysRemaining };
}
