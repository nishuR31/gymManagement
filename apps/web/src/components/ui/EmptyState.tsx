import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-border bg-surface/75 px-4 py-8 text-center">
      <div className="grid justify-items-center">
        <div className="grid h-11 w-11 place-items-center rounded-md bg-line-faint text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
