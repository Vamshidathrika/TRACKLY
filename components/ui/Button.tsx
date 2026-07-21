import { ButtonHTMLAttributes } from "react";

const styles = {
  primary: "bg-brand hover:bg-brand-hover text-white",
  default: "bg-[#F4F5F7] hover:bg-[#EBECF0] text-text",
  subtle: "bg-transparent hover:bg-[#EBECF0] text-text",
  danger: "bg-danger hover:bg-[#BF2600] text-white",
} as const;

export function Button({ appearance = "default", className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { appearance?: keyof typeof styles }) {
  return (
    <button
      className={`inline-flex h-8 items-center gap-1 rounded-ds px-3 text-sm font-medium transition-colors disabled:opacity-50 ${styles[appearance]} ${className}`}
      {...props}
    />
  );
}
