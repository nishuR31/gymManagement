import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, children, className = "" }: CardProps) {
  return (
    <div className={`card-base ${className}`}>
      {title || action ? (
        <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
          {title ? <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3> : <span />}
          {action}
        </div>
      ) : null}
      <div className="p-6 pt-4">{children}</div>
    </div>
  );
}
