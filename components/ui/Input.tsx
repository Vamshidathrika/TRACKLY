import { InputHTMLAttributes, useId } from "react";

export function Input({ label, error, className = "", ...props }:
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-xs font-semibold text-text-subtle">{label}</label>}
      <input
        id={id}
        className={`h-9 rounded-ds border-2 bg-surface px-2 text-sm outline-none transition-colors focus:border-brand ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
