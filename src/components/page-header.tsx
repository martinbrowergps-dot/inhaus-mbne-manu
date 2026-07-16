import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  exportButton,
}: {
  title: string;
  subtitle?: string;
  exportButton?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="fade-up text-xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="fade-up text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {exportButton && <div>{exportButton}</div>}
    </div>
  );
}
