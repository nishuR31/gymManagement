export function formatCents(cents: number): string {
  const value = cents / 100;
  // Manual formatting for INR to avoid Intl crashes on Hermes
  const parts = value.toFixed(cents % 100 === 0 ? 0 : 2).split(".");
  let numStr = parts[0];
  if (numStr.length > 3) {
    const lastThree = numStr.substring(numStr.length - 3);
    const otherNumbers = numStr.substring(0, numStr.length - 3);
    numStr = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }
  return "₹" + numStr + (parts.length > 1 ? "." + parts[1] : "");
}

export function centsFromCurrency(value: string): number {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

export function formatDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Invalid Date";
  
  // Manual formatting to avoid toLocaleString crashes on Hermes
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[date.getMonth()];
  const d = date.getDate();
  const y = date.getFullYear();
  
  let h = date.getHours();
  const min = date.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // hour '0' should be '12'

  return `${m} ${d}, ${y}, ${h}:${min} ${ampm}`;
}

export function formatRelativeTime(value: string): string {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (isNaN(timestamp)) return "";
  
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const units: Array<[string, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1]
  ];
  const [unit, secondsPerUnit] = units.find(([, seconds]) => absSeconds >= seconds) ?? ["second", 1];

  const val = Math.round(absSeconds / secondsPerUnit);
  const unitStr = val === 1 ? unit : unit + "s";
  
  return diffSeconds < 0 ? `${val} ${unitStr} ago` : `in ${val} ${unitStr}`;
}

export function readableStatus(value: string): string {
  if (!value) return "";
  return value
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}
