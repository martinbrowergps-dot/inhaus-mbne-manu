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
    <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent drop-shadow-sm">
            {title}
          </h1>
          {filterBadge}
        </div>
        {subtitle && (
          <p className="text-[11px] font-medium tracking-[0.05em] text-muted-foreground/80 uppercase">
            {subtitle}
          </p>
        )}
      </div>
      {exportButton && <div className="flex items-center gap-2">{exportButton}</div>}
    </div>
  );
}
