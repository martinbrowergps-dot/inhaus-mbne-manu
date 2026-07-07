import type { ElementType, ReactNode } from "react";

const SECTION_COLORS = ["text-primary", "text-success", "text-warning", "text-destructive"] as const;

export function Section({
  label,
  insight,
  icon: Icon,
  colorIndex = 0,
  children,
}: {
  label: string;
  insight: string;
  icon?: ElementType;
  colorIndex?: number;
  children: ReactNode;
}) {
  const colorClass = SECTION_COLORS[colorIndex % SECTION_COLORS.length];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 border-b border-border/30 pb-2">
        {Icon && (
          <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 ${colorClass}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${colorClass}`}>
            {label}
          </span>
          <p className="truncate text-xs text-muted-foreground/70 leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
