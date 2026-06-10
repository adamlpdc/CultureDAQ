import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DashboardPanelProps {
  children: ReactNode;
  className?: string;
}

export function DashboardPanel({ children, className }: DashboardPanelProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border bg-surface p-3.5 shadow-card lg:p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
