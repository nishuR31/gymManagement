import { APP_NAME } from "@/utils/env";

export function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 animate-fade-in w-full">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">Terms of Service</h1>
        <p className="text-lg text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="prose prose-invert prose-zinc max-w-none text-muted-foreground space-y-8 bg-card/30 p-8 md:p-12 rounded-2xl border border-border shadow-sm">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm">1</span>
            Acceptance of Terms
          </h2>
          <p className="leading-relaxed">By accessing and using {APP_NAME} services, you accept and agree to be bound by the terms and provision of this agreement. These terms apply to all visitors, users, and others who access or use our facilities and services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm">2</span>
            Gym Memberships & Usage
          </h2>
          <p className="leading-relaxed">Memberships are strictly non-transferable. Members must adhere to the gym's code of conduct, which includes respecting equipment, staff, and other members. {APP_NAME} reserves the right to terminate memberships for violations of these policies.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm">3</span>
            Health & Safety Waiver
          </h2>
          <p className="leading-relaxed">Physical exercise can be strenuous and subject to risk of serious injury. You are urged to obtain a physical examination from a doctor before using any exercise equipment or participating in any exercise activity. You agree that if you engage in any physical exercise or activity, you do so entirely at your own risk.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm">4</span>
            Billing & Cancellations
          </h2>
          <p className="leading-relaxed">Monthly memberships are billed automatically on your designated billing cycle. To avoid charges for the following month, cancellation requests must be submitted at least 7 days prior to your billing date. No refunds will be provided for partial months.</p>
        </section>
      </div>
    </div>
  );
}
