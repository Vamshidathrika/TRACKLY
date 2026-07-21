export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (src) return <img src={src} alt={name} width={size} height={size} className="rounded-full" />;
  return (
    <span
      style={{ width: size, height: size, fontSize: size === 24 ? 10 : 12 }}
      className="flex items-center justify-center rounded-full bg-brand font-semibold text-white"
    >
      {initials}
    </span>
  );
}
