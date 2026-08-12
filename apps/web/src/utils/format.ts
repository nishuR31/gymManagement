export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2
  }).format(cents / 100);
}

export function centsFromCurrency(value: string): number {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1]
  ];
  const [unit, secondsPerUnit] = units.find(([, seconds]) => absSeconds >= seconds) ?? ["second", 1];

  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(diffSeconds / secondsPerUnit), unit);
}

export function readableStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}
