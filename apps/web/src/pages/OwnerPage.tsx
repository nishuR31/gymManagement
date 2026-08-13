import { Dumbbell, ShieldCheck, Trophy, Target, Stethoscope, Award, Medal, HeartPulse } from "lucide-react";
import { APP_NAME } from "../utils/env";
import { Card } from "../components/ui/Card";

export function OwnerPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 animate-fade-in w-full">
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Meet the Owner & Head Coach</p>
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight">John Doe</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Dedicated to pushing limits while prioritizing safety, injury prevention, and scientific training methods. With over 15 years of active practice and coaching.
        </p>
      </div>

      <div className="grid gap-12 md:grid-cols-2 items-center mb-16">
        <div className="order-2 md:order-1">
          <h2 className="text-3xl font-black text-foreground mb-6">Expertise You Can Trust</h2>
          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <p>
              When I opened {APP_NAME}, the goal was simple: create an environment where members can train hard without the fear of preventable injuries. My approach combines rigorous strength and conditioning principles with clinical rehabilitative strategies.
            </p>
            <p>
              Over my 15-year career, I have worked with hundreds of athletes and fitness enthusiasts, guiding them through complex injury recoveries, mobility improvements, and peak performance training. Whether you're rehabbing a shoulder or trying to break a personal record, I am here to guide you with proven, evidence-based methods.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-panel/30 border border-border rounded-lg px-4 py-3 shadow-sm">
              <HeartPulse className="text-primary h-5 w-5" />
              <span className="text-sm font-bold text-foreground">Injury Rehab</span>
            </div>
            <div className="flex items-center gap-2 bg-panel/30 border border-border rounded-lg px-4 py-3 shadow-sm">
              <ShieldCheck className="text-primary h-5 w-5" />
              <span className="text-sm font-bold text-foreground">Safe Programming</span>
            </div>
            <div className="flex items-center gap-2 bg-panel/30 border border-border rounded-lg px-4 py-3 shadow-sm">
              <Stethoscope className="text-primary h-5 w-5" />
              <span className="text-sm font-bold text-foreground">Clinical Guidance</span>
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2 relative">
          <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full" />
          <img
            src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80"
            alt="Owner in the gym"
            className="relative rounded-2xl border border-border shadow-lg object-cover w-full h-[500px]"
          />
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-3xl font-black text-foreground mb-8 text-center">Certifications & Proof of Work</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="hover:border-brand/50 transition">
            <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4 text-primary">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">CSCS Certified</h3>
            <p className="text-sm text-muted-foreground">Certified Strength and Conditioning Specialist (NSCA). Specialized in athletic performance and injury prevention.</p>
          </Card>

          <Card className="hover:border-brand/50 transition">
            <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4 text-primary">
              <Medal className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">NASM Corrective Exercise</h3>
            <p className="text-sm text-muted-foreground">Certified Corrective Exercise Specialist. Trained to identify and correct movement dysfunctions to prevent injuries.</p>
          </Card>

          <Card className="hover:border-brand/50 transition">
            <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">CPR / AED / First Aid</h3>
            <p className="text-sm text-muted-foreground">Advanced first response certification from the American Red Cross, ensuring a safe training environment at all times.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
