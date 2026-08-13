import { AlertTriangle, Check, Circle, Clock3, Snowflake, X } from "lucide-react";
import { readableStatus } from "../../utils/format";

const toneByStatus: Record<string, string> = {
  ACTIVE: "bg-success-soft text-success",
  PAID: "bg-success-soft text-success",
  PARTIALLY_PAID: "bg-warning-soft text-warning",
  PENDING: "bg-secondary text-muted-foreground",
  REFUNDED: "bg-secondary text-muted-foreground",
  CANCELLED: "bg-accent-soft text-destructive",
  EXPIRED: "bg-secondary text-muted-foreground",
  EXPIRING_SOON: "bg-warning-soft text-warning",
  FROZEN: "bg-secondary text-muted-foreground",
  LOW: "bg-secondary text-muted-foreground",
  NORMAL: "bg-success-soft text-success",
  HIGH: "bg-warning-soft text-warning",
  NEW: "bg-warning-soft text-warning",
  READ: "bg-secondary text-muted-foreground",
  SUPER_ADMIN: "bg-accent-soft text-destructive",
  GYM_OWNER: "bg-warning-soft text-warning",
  ADMIN: "bg-secondary text-primary",
  STAFF: "bg-secondary text-muted-foreground",
  TRAINER: "bg-success-soft text-success"
};

const iconByStatus = {
  ACTIVE: Check,
  APPROVED: Check,
  PAID: Check,
  PARTIALLY_PAID: Clock3,
  PENDING: Clock3,
  REFUNDED: Circle,
  CANCELLED: X,
  REJECTED: X,
  SUSPENDED: AlertTriangle,
  EXPIRED: AlertTriangle,
  EXPIRING_SOON: AlertTriangle,
  FROZEN: Snowflake,
  LOW: AlertTriangle,
  NORMAL: Check,
  HIGH: AlertTriangle,
  NEW: Clock3,
  READ: Check,
  SUPER_ADMIN: Check,
  GYM_OWNER: Check,
  ADMIN: Check,
  STAFF: Circle,
  TRAINER: Check
};

export function StatusBadge({ status }: { status: string }) {
  const Icon = iconByStatus[status as keyof typeof iconByStatus] ?? Circle;

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 truncate rounded px-2 py-1 text-xs font-bold ${toneByStatus[status] ?? "bg-secondary text-muted-foreground"}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {readableStatus(status)}
    </span>
  );
}
