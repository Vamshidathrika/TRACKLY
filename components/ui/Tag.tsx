const colors = {
  gray: "bg-[#DFE1E6] text-text",
  blue: "bg-[#DEEBFF] text-brand",
  green: "bg-[#E3FCEF] text-success",
  red: "bg-[#FFEBE6] text-danger",
} as const;

export function Tag({ children, color = "gray" }: { children: React.ReactNode; color?: keyof typeof colors }) {
  return <span className={`inline-flex items-center rounded-ds px-1.5 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>;
}
