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
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  glow?: boolean;
  glass?: boolean;
}) {
  return (
    <section
      className={cn(
        "fade-up rounded-xl p-5",
        glass ? "panel-glass" : "panel",
        glow && "panel-glow",
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
