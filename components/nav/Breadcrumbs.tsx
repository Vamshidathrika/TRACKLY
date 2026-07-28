import Link from "next/link";
import { Fragment } from "react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumbs" className="flex items-center gap-1 text-sm text-text-subtle overflow-x-auto flex-nowrap whitespace-nowrap">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-brand hover:underline py-1.5 truncate max-w-[120px] sm:max-w-[200px] inline-block align-bottom">{item.label}</Link>
          ) : (
            <span className="truncate max-w-[120px] sm:max-w-[200px] py-1.5 inline-block align-bottom">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
