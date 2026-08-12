interface LoadBarProps {
  value: number;
  max: number;
  label?: string;
  maxLabel?: string;
  tone?: "brand" | "success" | "warning" | "danger";
}

export function LoadBar({ value, max, label, maxLabel, tone }: LoadBarProps) {
  const percent = max <= 0 ? 100 : Math.min(100, Math.max(0, (value / max) * 100));
  const resolvedTone = tone ?? (value <= max ? "warning" : "brand");
  const toneClass = {
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-accent"
  }[resolvedTone];

  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs font-semibold text-ink-muted">
        <span>{label ?? `${value}`}</span>
        <span className="font-mono tabular-nums">{maxLabel ?? max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line-faint">
        <div className={`h-full rounded-full transition-all duration-500 ${toneClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
