import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, children, className = "" }: CardProps) {
  return (
    <section className={`surface-gradient min-w-0 overflow-hidden rounded-lg border border-line shadow-soft transition duration-200 ${className}`}>
      {title || action ? (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-line-faint/25 px-4 py-3">
          {title ? <h3 className="text-base font-bold text-ink">{title}</h3> : <span />}
          {action}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
