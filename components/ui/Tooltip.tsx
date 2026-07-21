"use client";
import * as T from "@radix-ui/react-tooltip";

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <T.Provider delayDuration={300}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content sideOffset={4} className="z-50 rounded-ds bg-[#172B4D] px-2 py-1 text-xs text-white">
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
