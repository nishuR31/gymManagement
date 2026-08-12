import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  isLoading?: boolean;
}

export function Button({ children, variant = "primary", className = "", isLoading = false, disabled, ...props }: ButtonProps) {
  const base =
    "inline-flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-bold transition duration-200 focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-60";
  const variants = {
    primary: "gold-gradient text-panel shadow-soft hover:-translate-y-0.5 hover:saturate-125",
    secondary: "border border-line panel-gradient text-ink shadow-soft hover:-translate-y-0.5 hover:border-brand",
    ghost: "text-ink-muted hover:bg-line-faint hover:text-ink"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || isLoading} {...props}>
      {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
