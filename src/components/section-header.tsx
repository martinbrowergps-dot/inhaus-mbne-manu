import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_COLORS = [
  "text-primary",
  "text-success",
  "text-warning",
  "text-destructive",
] as const;

const SECTION_ICON_BG = [
  "bg-primary/10",
  "bg-success/10",
  "bg-warning/10",
  "bg-destructive/10",
] as const;

export function SectionHeader({
  label,
  insight,
  icon: Icon,
  colorIndex = 0,
  children,
}: {
  label: string;
  insight: string;
  icon?: LucideIcon;
  colorIndex?: number;
  children: ReactNode;
}) {
  const idx = colorIndex % SECTION_COLORS.length;
  const colorClass = SECTION_COLORS[idx];

  return (
    <section className="space-y-5 pt-3">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border border-border/60",
                SECTION_ICON_BG[idx],
                colorClass,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
          <span className={cn("text-sm font-bold tracking-normal", colorClass)}>
            {label}
          </span>
        </div>
        <p className="max-w-3xl pl-11 text-xs leading-relaxed text-muted-foreground">
          {insight}
        </p>
      </div>
      <div className="fade-up">{children}</div>
    </section>
  );
}
