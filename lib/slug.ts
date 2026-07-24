export function makeSlug(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = cleaned || "workspace";
  const suffix = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return `${base}-${suffix}`;
}
