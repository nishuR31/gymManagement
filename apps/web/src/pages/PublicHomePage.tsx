import { Link } from "react-router-dom";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, Clock3, CreditCard, Dumbbell, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { submitPublicInquiry } from "../features/public/publicApi";
import { getApiErrorMessage } from "../utils/apiError";

export function PublicHomePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (): Promise<void> => {
    if (saving || !name.trim() || !email.trim() || phone.trim().length < 7 || message.trim().length < 10) {
      return;
    }
    setSaving(true);
    try {
      await submitPublicInquiry({ name, email, phone, message });
      toast.success("Inquiry sent");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send inquiry"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface text-ink">
      <section className="relative flex min-h-[88vh] items-stretch overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1800&q=85"
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover motion-safe:animate-fade-in"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(112deg, var(--color-backdrop) 0%, color-mix(in srgb, var(--color-backdrop) 92%, transparent) 38%, color-mix(in srgb, var(--color-backdrop) 48%, transparent) 70%, transparent 100%), linear-gradient(0deg, var(--color-backdrop) 0%, color-mix(in srgb, var(--color-backdrop) 72%, transparent) 24%, transparent 58%)"
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-28"
          style={{
            background: "linear-gradient(180deg, transparent 0%, var(--color-surface) 100%)"
          }}
        />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-14 pt-5 md:px-6">
          <header className="mb-auto flex items-center justify-between gap-4 rounded-lg border border-line bg-backdrop/70 px-4 py-3 shadow-soft backdrop-blur">
            <Link className="flex items-center gap-3 text-ink" to="/">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-panel">
                <Dumbbell className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-black uppercase tracking-[0.18em] text-brand-light">ValorFitness</span>
                <span className="block text-xs font-semibold text-ink-muted">Iron & Chalk Training Club</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              <Link className="rounded-md px-3 py-2 text-sm font-bold text-ink-muted transition hover:bg-panel/10 hover:text-ink" to="/plans">Plans</Link>
              <Link className="rounded-md px-3 py-2 text-sm font-bold text-ink-muted transition hover:bg-panel/10 hover:text-ink" to="/member-login">Member Login</Link>
              <Link className="rounded-md border border-line bg-panel/10 px-3 py-2 text-sm font-bold text-ink transition hover:border-brand" to="/login">Admin</Link>
            </nav>
          </header>

          <div className="grid gap-8 pb-4 pt-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-4xl animate-slide-up">
              <p className="inline-flex items-center gap-2 rounded-md border border-brand/40 bg-backdrop/85 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-brand-light shadow-soft">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                ValorFitness
              </p>
              <h1 className="mt-5 max-w-4xl text-balance text-5xl font-black leading-tight text-ink md:text-7xl">
                Train with intent. Track every win.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-ink-muted md:text-lg">
                Strength training, personal coaching, flexible memberships, and a front desk experience that keeps every visit moving.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="inline-flex h-12 items-center gap-2 rounded-md bg-brand px-5 text-sm font-black text-panel shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-dark" to="/plans">
                  View Plans
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link className="inline-flex h-12 items-center rounded-md border border-line bg-backdrop/55 px-5 text-sm font-bold text-ink shadow-soft transition hover:-translate-y-0.5 hover:border-brand" to="/login">
                  Admin / Staff Login
                </Link>
                <Link className="inline-flex h-12 items-center rounded-md border border-line bg-backdrop/35 px-5 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:border-brand" to="/member-login">
                  Member Login
                </Link>
              </div>
            </div>

            <div className="hidden animate-fade-in rounded-lg border border-line bg-backdrop/75 p-4 shadow-soft backdrop-blur lg:block">
              <div className="grid gap-3">
                <HeroStat icon={Users} label="Member-first" value="Live floor ops" />
                <HeroStat icon={Clock3} label="Fast desk" value="Check-ins in seconds" />
                <HeroStat icon={ShieldCheck} label="Secure" value="Role-based access" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line dark-band-gradient">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 md:grid-cols-3 md:px-6">
          <MiniProof icon={MapPin} label="Single-gym focus" value="Built for one serious training floor" />
          <MiniProof icon={BadgeCheck} label="Coached workflows" value="Members, plans, attendance, billing" />
          <MiniProof icon={Sparkles} label="Operational clarity" value="Staff tools without admin clutter" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:px-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div>
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">What members feel</p>
            <h2 className="mt-3 text-3xl font-black text-ink md:text-4xl">A gym experience that feels organized from warm-up to checkout.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {offerings.map((item, index) => (
              <Card key={item.title} title={item.title} className="group hover:-translate-y-1 hover:border-brand">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-md bg-brand text-panel shadow-soft transition group-hover:scale-105">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-xs font-black text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p className="text-sm leading-6 text-ink-muted">{item.copy}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card title="Contact ValorFitness" className="surface-gradient ring-1 ring-brand/15">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input label="Phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <label className="grid gap-2 text-sm font-medium text-ink">
              <span>Message</span>
              <textarea
                className="min-h-32 rounded-md border border-line bg-surface/70 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <Button type="submit" className="mt-2" disabled={saving || !name.trim() || !email.trim() || phone.trim().length < 7 || message.trim().length < 10}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {saving ? "Sending" : "Send Inquiry"}
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}

const offerings = [
  {
    title: "Strength floor",
    icon: Dumbbell,
    copy: "Purpose-built training space for progressive strength, conditioning blocks, and focused solo sessions."
  },
  {
    title: "Personal coaching",
    icon: ShieldCheck,
    copy: "Coaches keep plans, check-ins, and member progress aligned so accountability feels natural."
  },
  {
    title: "Flexible plans",
    icon: CreditCard,
    copy: "Memberships are clear, renewable, and easy for the front desk to manage without friction."
  }
];

function HeroStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-panel/10 p-3">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-brand text-panel">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-light">{label}</p>
        <p className="text-sm font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}

function MiniProof({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3 shadow-soft">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-line-faint text-brand">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-black text-ink">{label}</p>
        <p className="text-xs font-semibold text-ink-muted">{value}</p>
      </div>
    </div>
  );
}
