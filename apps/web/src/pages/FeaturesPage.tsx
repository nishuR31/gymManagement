import { ShieldCheck, Dumbbell, Smartphone, QrCode, TrendingUp, Calendar, Zap } from 'lucide-react';
import { APP_NAME } from '../utils/env';

export function FeaturesPage() {
  const platformFeatures = [
    {
      title: "For Gym Members",
      description: "Everything you need to train seamlessly.",
      features: [
        { icon: QrCode, title: "QR Check-ins", description: "Scan your digital code at the front desk and get straight to lifting." },
        { icon: TrendingUp, title: "Attendance Tracking", description: "View your historical visits and stay accountable to your goals." },
        { icon: Calendar, title: "Class Scheduling", description: "Browse upcoming classes, book your spot, and sync with your calendar." },
        { icon: Smartphone, title: "Mobile Experience", description: "A beautifully crafted native app available for your phone." }
      ]
    },
    {
      title: "For Staff & Management",
      description: "The tools to run your facility smoothly.",
      features: [
        { icon: ShieldCheck, title: "Member Management", description: "Add, suspend, or upgrade members. Track waiver statuses instantly." },
        { icon: Zap, title: "Real-time Dashboard", description: "Get a live overview of gym capacity, recent check-ins, and daily revenue." },
        { icon: Dumbbell, title: "Inventory & Orders", description: "Manage supplements and gear. Process point-of-sale orders with ease." },
        { icon: TrendingUp, title: "Financial Reports", description: "Export payments, track failed renewals, and forecast monthly revenue." }
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black text-foreground tracking-tight sm:text-5xl mb-4">
          Features that power {APP_NAME}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Whether you're hitting PRs on the floor or managing the front desk, our platform is designed for speed and clarity.
        </p>
      </div>

      <div className="grid gap-16 lg:grid-cols-2">
        {platformFeatures.map((platform, idx) => (
          <div key={idx} className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-foreground mb-2">{platform.title}</h2>
            <p className="text-muted-foreground mb-8">{platform.description}</p>
            
            <div className="space-y-6">
              {platform.features.map((feature, fIdx) => (
                <div key={fIdx} className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
