"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type VirtualListProps<T> = {
  items: T[];
  estimateSize?: (index: number) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
};

export function VirtualList<T>({
  items,
  estimateSize = () => 100,
  renderItem,
  className = "",
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Fallback for jsdom / unmeasured containers (e.g. unit tests)
  const itemsToRender =
    virtualItems.length > 0
      ? virtualItems
      : items.map((_, i) => ({
          key: i,
          index: i,
          start: i * 100,
          size: 100,
        }));

  return (
    <div ref={scrollRef} className={className} style={{ overflowY: "auto", minHeight: "100px" }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize() || items.length * 100}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {itemsToRender.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
