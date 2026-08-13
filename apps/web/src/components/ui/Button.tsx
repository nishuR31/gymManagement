import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  isLoading?: boolean;
}

export function Button({ children, variant = "primary", className = "", isLoading = false, disabled, ...props }: ButtonProps) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
    destructive: "btn-destructive",
    ghost: "btn-ghost"
  };

  return (
    <button className={`btn-base ${variants[variant]} ${className}`} disabled={disabled || isLoading} {...props}>
      {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
