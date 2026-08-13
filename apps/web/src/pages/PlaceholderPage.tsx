import { useParams } from "react-router-dom";

const titles: Record<string, string> = {
  members: "Members",
  payments: "Payments",
  inventory: "Inventory",
  settings: "Settings"
};

export function PlaceholderPage() {
  const params = useParams();
  const section = params.section ?? "";
  const title = titles[section] ?? "Dashboard";

  return (
    <section className="max-w-6xl">
      <div className="border-b border-border pb-5">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="mt-6 min-h-[360px] rounded-lg border border-dashed border-border bg-card" />
    </section>
  );
}
