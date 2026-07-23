"use client";

import { useState } from "react";
import { HelpCircle, Info, ExternalLink } from "lucide-react";

export type EmptyStateConfig = {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
};

export type DashboardCardProps = {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: React.ReactNode;
  emptyState?: EmptyStateConfig;
  isEmpty?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function DashboardCard({
  title,
  icon: Icon,
  badge,
  emptyState,
  isEmpty = false,
  children,
  className = "",
}: DashboardCardProps) {
  return (
    <div
      className={`rounded-[14px] border border-border-default bg-surface shadow-xs flex flex-col overflow-hidden transition-all hover:border-border-strong ${className}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default bg-surface-sunken/40">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-brand" />
          <h3 className="text-[13px] font-bold text-default tracking-tight uppercase font-mono">
            {title}
          </h3>
        </div>
        {badge}
      </div>

      {/* Card Content or Empty State */}
      <div className="p-5 flex-1 flex flex-col justify-center">
        {isEmpty && emptyState ? (
          <div className="py-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            {emptyState.icon ? (
              <emptyState.icon size={36} className="text-subtler mb-2" />
            ) : (
              <Info size={36} className="text-brand/60 mb-2" />
            )}
            <h4 className="text-sm font-bold text-default mb-1">{emptyState.title}</h4>
            <p className="text-xs text-subtle mb-4 leading-relaxed">{emptyState.description}</p>
            {emptyState.actionText && (
              <a
                href={emptyState.actionHref || "#"}
                onClick={(e) => {
                  if (emptyState.onAction) {
                    e.preventDefault();
                    emptyState.onAction();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                {emptyState.actionText} <ExternalLink size={12} />
              </a>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
