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
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-normal text-foreground md:text-3xl">
            {title}
          </h1>
          {filterBadge}
        </div>
        {subtitle && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {exportButton && <div className="flex items-center gap-2">{exportButton}</div>}
    </div>
  );
}
