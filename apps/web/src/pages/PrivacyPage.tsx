import { APP_NAME } from "@/utils/env";

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 animate-fade-in w-full">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">Privacy Policy</h1>
        <p className="text-lg text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="prose prose-invert prose-zinc max-w-none text-muted-foreground space-y-8 bg-panel/30 p-8 md:p-12 rounded-2xl border border-border shadow-sm">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h2>
          <p className="leading-relaxed">We collect information you provide directly to us, such as when you create or modify your account, request services, contact customer support, or otherwise communicate with us. This includes your name, email address, phone number, and physical fitness information provided during sign-up.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Use of Information</h2>
          <p className="leading-relaxed">We use the information we collect about you to provide, maintain, and improve our services, including to process transactions, send you technical notices, updates, security alerts, and support messages. We may also use this information to tailor your fitness experience at {APP_NAME}.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Sharing of Information</h2>
          <p className="leading-relaxed">We do not share your personal information with third parties except as described in this policy, such as with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf. We never sell your personal data.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
          <p className="leading-relaxed">If you have any questions about this Privacy Policy, please contact us at support@valorfitness.example.com or visit us directly at the gym's front desk.</p>
        </section>
      </div>
    </div>
  );
}
