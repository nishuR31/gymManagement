import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = "", ...props }, ref) {
    return (
      <label className={`grid min-w-0 text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${label ? "gap-2" : ""}`}>
        {label ? <span>{label}</span> : null}
        <input
          ref={ref}
          className={`input-base ${className}`}
          {...props}
        />
        {error ? <span className="text-sm font-medium text-red-500">{error}</span> : null}
      </label>
    );
  }
);
