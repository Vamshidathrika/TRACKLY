import { ButtonHTMLAttributes } from "react";

const styles = {
  primary:
    "bg-brand hover:bg-brand-hovered text-white shadow-sm hover:shadow-md active:scale-[0.97]",
  default:
    "bg-neutral hover:bg-neutral-hovered text-default border border-border-default hover:border-border-strong",
  subtle:
    "bg-transparent hover:bg-neutral text-default",
  danger:
    "bg-danger hover:bg-[#FF2D20] text-white shadow-sm active:scale-[0.97]",
} as const;

export function Button({
  appearance = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { appearance?: keyof typeof styles }) {
  return (
    <button
      className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium transition-all disabled:opacity-50 disabled:pointer-events-none ${styles[appearance]} ${className}`}
      {...props}
    />
  );
}
