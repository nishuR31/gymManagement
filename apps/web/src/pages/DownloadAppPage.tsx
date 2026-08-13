import { useState } from "react";
import { APP_NAME } from "../utils/env";
import { CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function DownloadAppPage() {
  const [platform, setPlatform] = useState<"ios" | "android">("ios");

  const iosUrl = "https://apps.apple.com/app/valorfitness";
  const androidUrl = "https://play.google.com/store/apps/details?id=com.valorfitness";
  const currentUrl = platform === "ios" ? iosUrl : androidUrl;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}&color=000000&bgcolor=ffffff`;

  return (
    <div className="w-full animate-fade-in pb-16">
      <section className="relative px-6 py-20 md:py-24 overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-brand/5 blur-[120px] rounded-full" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground shadow-sm mb-6">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            {APP_NAME} App
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight text-balance">
            Your gym pass in your pocket.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            Download our app for better services, easy access, and a more convenient gym experience. View timelines, track your classes, and manage your membership seamlessly.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button className="h-14 px-8 text-base" onClick={() => setPlatform("ios")}>
              Download for iOS
            </Button>
            <Button variant="secondary" className="h-14 px-8 text-base" onClick={() => setPlatform("android")}>
              Download for Android
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div>
              <h2 className="text-3xl font-black text-foreground mb-4">How to get started</h2>
              <p className="text-muted-foreground">It takes less than a minute to setup your account and start using the app.</p>
            </div>

            <div className="space-y-6">
              <Step number="01" title="Download & Install" description="Get the app from the App Store or Google Play." />
              <Step number="02" title="Sign In" description="Use your member email and password." />
              <Step number="03" title="Scan & Go" description="Use the app barcode to quickly scan in at the front desk." />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-brand/20 blur-[100px] rounded-full" />
            <div className="card-base relative p-6 shadow-xl mx-auto max-w-sm transform rotate-2 hover:rotate-0 transition duration-500">
              <div className="border border-border/50 bg-background rounded-2xl p-4 h-150 flex flex-col items-center justify-center text-center">
                <div className="flex gap-1 p-1 card-base rounded-lg mb-8">
                  <button
                    onClick={() => setPlatform("ios")}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition flex items-center gap-2 ${platform === "ios" ? "bg-primary text-panel shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    iOS
                  </button>
                  <button
                    onClick={() => setPlatform("android")}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition flex items-center gap-2 ${platform === "android" ? "bg-primary text-panel shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Android
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl shadow-sm mb-6">
                  <img src={qrCodeUrl} alt={`QR Code for ${platform}`} className="h-36 w-36" />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">Scan to download</h3>
                <p className="text-sm text-muted-foreground mb-8">Point your camera to get the {platform === "ios" ? "iOS" : "Android"} app</p>

                <div className="w-full space-y-3">
                  <div className="h-12 card-base w-full animate-pulse bg-brand/5" />
                  <div className="h-12 card-base w-full animate-pulse bg-brand/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="text-3xl font-black text-foreground mb-10 text-center">App Functionalities</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            title="Fast Check-in"
            description="No more waiting at the front desk. Flash your app barcode to scan in instantly."
          />
          <FeatureCard
            title="Class Timelines"
            description="View daily schedules, track class availability, and book your spot ahead of time."
          />
          <FeatureCard
            title="Membership Management"
            description="Check your billing cycle, renew plans, or upgrade your membership natively in the app."
          />
        </div>
      </section>
    </div>
  );
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="shrink-0 w-12 h-12 bg-brand/10 text-primary font-black rounded-full flex items-center justify-center text-sm border border-brand/20">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string, description: string }) {
  return (
    <Card className="hover:border-brand/50 transition">
      <div className="mb-4 text-primary">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}
