import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardSectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function DashboardSectionHeader({
  title,
  icon,
  href,
  linkLabel = "View all",
  className,
}: DashboardSectionHeaderProps) {
  return (
    <div className={cn("mb-3.5 flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted">
            {icon}
          </span>
        )}
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="text-xs font-semibold text-primary hover:text-primary-hover"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
