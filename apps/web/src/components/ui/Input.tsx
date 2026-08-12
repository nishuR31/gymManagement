import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = "", ...props }, ref) {
    return (
      <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
        <span>{label}</span>
        <input
          ref={ref}
          className={`h-11 w-full min-w-0 rounded-md border border-line bg-backdrop/35 px-3 text-sm text-ink outline-none transition placeholder:text-ink-faint hover:border-brand/60 focus:border-brand focus:ring-2 focus:ring-brand/30 ${className}`}
          {...props}
        />
        {error ? <span className="text-sm font-medium text-accent">{error}</span> : null}
      </label>
    );
  }
);
