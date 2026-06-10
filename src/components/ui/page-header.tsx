import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h1 className="text-display text-2xl font-bold text-foreground md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted md:text-base">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  linkLabel?: string;
}

export function SectionHeader({
  title,
  description,
  icon,
  href,
  linkLabel = "View all",
}: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between border-b border-border pb-3">
      <div>
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted">
              {icon}
            </span>
          )}
          <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">{title}</h2>
        </div>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {href && (
        <a
          href={href}
          className="shrink-0 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
}
