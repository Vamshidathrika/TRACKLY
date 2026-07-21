import Link from "next/link";
import { Fragment } from "react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumbs" className="flex items-center gap-1 text-sm text-text-subtle">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-brand hover:underline">{item.label}</Link>
          ) : (
            <span>{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
