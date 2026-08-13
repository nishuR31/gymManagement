import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, Clock3, CreditCard, Dumbbell, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { submitPublicInquiry } from "../features/public/publicApi";
import { getApiErrorMessage } from "../utils/apiError";

interface InquiryForm {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export function PublicHomePage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InquiryForm>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: ""
    }
  });

  const onSubmit = async (data: InquiryForm): Promise<void> => {
    try {
      await submitPublicInquiry(data);
      toast.success("Inquiry sent");
      reset();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send inquiry"));
    }
  };

  return (
    <main className="min-h-screen bg-background overflow-y-auto snap-y snap-proximity scroll-smooth text-foreground">
      <section className="sticky top-0 snap-start flex h-screen items-stretch overflow-hidden -mt-[68px] pt-[68px]">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1800&q=85"
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover motion-safe:animate-fade-in"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(112deg, hsl(var(--background)) 0%, color-mix(in srgb, hsl(var(--background)) 92%, transparent) 38%, color-mix(in srgb, hsl(var(--background)) 48%, transparent) 70%, transparent 100%), linear-gradient(0deg, hsl(var(--background)) 0%, color-mix(in srgb, hsl(var(--background)) 72%, transparent) 24%, transparent 58%)"
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-28"
          style={{
            background: "linear-gradient(180deg, transparent 0%, hsl(var(--background)) 100%)"
          }}
        />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-14 pt-5 md:px-6">
          <div className="grid gap-8 pb-4 pt-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-4xl animate-slide-up">
              <p className="inline-flex items-center gap-2 rounded-md border border-brand/40 bg-backdrop/85 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                ValorFitness
              </p>
              <h1 className="mt-5 max-w-4xl text-balance text-5xl font-black leading-tight text-foreground md:text-7xl">
                Train with intent. Track every win.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-muted-foreground md:text-lg">
                Strength training, personal coaching, flexible memberships, and a front desk experience that keeps every visit moving.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-sm font-black text-panel shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:focus-ring" to="/plans" tabIndex={0}>
                  View Plans
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="hidden animate-fade-in rounded-lg border border-border bg-backdrop/75 p-4 shadow-sm backdrop-blur-xs lg:block">
              <div className="grid gap-3">
                <HeroStat icon={Users} label="Member-first" value="Live floor ops" />
                <HeroStat icon={Clock3} label="Fast desk" value="Check-ins in seconds" />
                <HeroStat icon={ShieldCheck} label="Secure" value="Role-based access" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 w-full snap-start overflow-hidden bg-background shadow-2xl">
        {/* Background image for bottom components */}
        <img
          src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1800&q=85"
          alt="Male training"
          className="absolute inset-0  h-full w-full object-cover opacity-60 dark:opacity-100"
          style={{ objectPosition: "center 20%" }}
        />
        {/* Gradient overlays to blend into the main background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/40 to-background" />
        {/* <div className="absolute inset-0 bg-background/30 " /> */}

        <div className="relative z-10">
          <section className="border-y border-border/30 bg-background/40 backdrop-blur-md">
            <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 md:grid-cols-3 md:px-6">
              <MiniProof icon={MapPin} label="Single-gym focus" value="Built for one serious training floor" />
              <MiniProof icon={BadgeCheck} label="Coached workflows" value="Members, plans, attendance, billing" />
              <MiniProof icon={Sparkles} label="Operational clarity" value="Staff tools without admin clutter" />
            </div>
          </section>

          <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:px-6 lg:grid-cols-[minmax(0,1fr)_430px]">
            <div>
              <div className="mb-6 max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">What members feel</p>
                <h2 className="mt-3 text-3xl font-black text-foreground md:text-4xl">A gym experience that feels organized from warm-up to checkout.</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {offerings.map((item, index) => (
                  <Card key={item.title} title={item.title} className="group hover:-translate-y-1 hover:border-brand transition-all">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-panel shadow-sm transition group-hover:scale-105">
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-xs font-black text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{item.copy}</p>
                  </Card>
                ))}
              </div>
            </div>

            <Card title="Contact ValorFitness" className="ring-1  ring-brand/15">
              <form
                className="grid gap-4"
                onSubmit={handleSubmit(onSubmit)}
              >
                <Input
                  label="Name"
                  {...register("name")}
                  error={errors.name?.message}
                />
                <Input
                  label="Email"
                  type="email"
                  {...register("email", { required: "Email is required" })}
                  error={errors.email?.message}
                />
                <Input
                  label="Phone"
                  type="tel"
                  {...register("phone")}
                  error={errors.phone?.message}
                />
                <label className="grid gap-2 text-sm font-medium text-foreground">
                  <span>Message</span>
                  <textarea
                    className="input-base min-h-32 resize-y"
                    {...register("message", { required: "Message is required" })}
                  />
                  {errors.message?.message && (
                    <span className="text-sm font-medium text-destructive">{errors.message.message as string}</span>
                  )}
                </label>
                <Button type="submit" className="mt-2" isLoading={isSubmitting}>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  {isSubmitting ? "Sending" : "Send Inquiry"}
                </Button>
              </form>
            </Card>
          </section>
        </div>
      </div>
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
    <div className="flex items-center gap-3 rounded-md border border-border bg-panel/10 p-3">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-panel">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MiniProof({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-line-faint text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-black text-foreground">{label}</p>
        <p className="text-xs font-semibold text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
