import { ButtonHTMLAttributes } from "react";

const styles = {
  primary: "bg-brand hover:bg-brand-hovered text-white",
  default: "bg-neutral hover:bg-neutral-hovered text-default",
  subtle: "bg-transparent hover:bg-neutral-hovered text-default",
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
