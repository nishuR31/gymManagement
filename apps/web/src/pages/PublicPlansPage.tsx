import type { PublicMembershipPlanDto } from "@gym/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, BadgeCheck, CalendarDays, CreditCard, Dumbbell, LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { listPublicPlans } from "../features/public/publicApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents } from "../utils/format";

export function PublicPlansPage() {
  const [plans, setPlans] = useState<PublicMembershipPlanDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        setPlans(await listPublicPlans());
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Could not load plans"));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <div
      className="animate-fade-in w-full"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, hsl(var(--background)) 82%, hsl(var(--primary))) 0%, color-mix(in srgb, hsl(var(--background)) 68%, hsl(var(--background))) 290px, hsl(var(--background)) 620px)"
      }}
    >
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:px-6">
        <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div className="animate-slide-up">
            <p className="inline-flex items-center gap-2 rounded-md border border-primary/35 bg-background/80 backdrop-blur-sm/70 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Live Plans
            </p>
            <h1 className="mt-4 text-balance text-4xl font-black text-foreground md:text-6xl">Memberships that keep training simple.</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground md:text-base">
              Plans are pulled directly from the active membership catalog, so the public site stays aligned with the front desk.
            </p>
          </div>
          <div className="grid gap-3 rounded-lg border border-border bg-card/80 p-4 shadow-sm">
            <ProofLine icon={BadgeCheck} text="Active plans only" />
            <ProofLine icon={CalendarDays} text="Durations shown in days" />
            <ProofLine icon={LockKeyhole} text="Purchases stay staff-assisted for now" />
          </div>
        </div>

        {loading ? <SkeletonRows rows={4} /> : null}
        {!loading && plans.length === 0 ? <EmptyState title="No active plans available" /> : null}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={`${plan.name}-${plan.durationDays}`} title={plan.name} className="group overflow-hidden hover:-translate-y-1 hover:border-primary">
              <div className="grid gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm transition group-hover:scale-105">
                    <CreditCard className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs font-black text-muted-foreground">
                    {plan.durationDays}D
                  </span>
                </div>
                <p className="font-mono text-3xl font-black text-foreground">{formatCents(plan.priceCents)}</p>
                <p className="font-mono text-sm font-bold text-muted-foreground">{plan.durationDays} days of access</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {plan.description ?? "Strength floor access, front-desk membership support, and eligibility tracking through the gym system."}
                </p>
                <Button disabled title="Member purchase flow is outside the current frontend phase">Staff-assisted enrollment</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProofLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface/70 px-3 py-2">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      <span className="text-sm font-bold text-foreground">{text}</span>
    </div>
  );
}
