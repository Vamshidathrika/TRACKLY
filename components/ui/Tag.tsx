const colors = {
  gray: "bg-neutral text-default",
  blue: "bg-selected text-selected-text",
  green: "bg-neutral text-success",
  red: "bg-neutral text-danger",
} as const;

export function Tag({ children, color = "gray" }: { children: React.ReactNode; color?: keyof typeof colors }) {
  return <span className={`inline-flex items-center rounded-ds px-1.5 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>;
}
