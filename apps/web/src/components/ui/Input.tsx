import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = "", ...props }, ref) {
    return (
      <label className="grid min-w-0 gap-2 text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        <span>{label}</span>
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
