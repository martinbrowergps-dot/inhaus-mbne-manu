import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  glow,
  glass,
  dataChart,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  glow?: boolean;
  glass?: boolean;
  dataChart?: string;
}) {
  return (
    <section
      data-chart={dataChart}
      className={cn(
        "fade-up rounded-lg p-4 md:p-5 overflow-hidden",
        glass ? "panel-glass" : "panel",
        glow && "panel-glow",
        className,
      )}
    >
      {(title || action) && (
        <div className="panel-header">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            {title && (
              <div className="panel-nameplate shrink-0">
                <span className="panel-nameplate-text">{title}</span>
              </div>
            )}
            {subtitle && (
              <span className="truncate text-xs text-muted-foreground min-w-0">{subtitle}</span>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
