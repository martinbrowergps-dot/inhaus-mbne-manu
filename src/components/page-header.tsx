import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  exportButton,
  filterBadge,
}: {
  title: string;
  subtitle?: string;
  exportButton?: ReactNode;
  filterBadge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="fade-up text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {filterBadge}
        </div>
        {subtitle && (
          <p className="fade-up text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {exportButton && <div>{exportButton}</div>}
    </div>
  );
}
