import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, rightElement, className = "", ...props }, ref) {
    const inputId = props.id || props.name;
    
    return (
      <div className={`grid min-w-0 text-sm font-medium leading-none text-foreground ${label ? "gap-2" : ""}`}>
        {label ? <label htmlFor={inputId} className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label> : null}
        <div className="relative flex items-center">
          <input
            id={inputId}
            ref={ref}
            className={`input-base w-full ${rightElement ? "pr-10" : ""} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-0 flex h-full items-center justify-center pr-3 text-muted-foreground hover:text-foreground">
              {rightElement}
            </div>
          )}
        </div>
        {error ? <span className="text-sm font-medium text-red-500">{error}</span> : null}
      </div>
    );
  }
);
