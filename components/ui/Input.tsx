import { InputHTMLAttributes, useId } from "react";

export function Input({
  label,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold text-subtle">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`h-9 rounded-[8px] border bg-surface px-3 text-[13px] text-default outline-none transition-all placeholder:text-subtlest
          ${error
            ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/15"
            : "border-border-default focus:border-brand focus:ring-2 focus:ring-brand/10"
          } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[11px] text-danger font-medium">{error}</span>
      )}
    </div>
  );
}
