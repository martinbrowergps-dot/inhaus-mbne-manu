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
    <section className="space-y-6 pt-2">
      <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm backdrop-blur-sm border border-white/5",
                SECTION_ICON_BG[idx],
                colorClass,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
          <span className={cn("text-xs font-black uppercase tracking-[0.2em]", colorClass)}>
            {label}
          </span>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground/60 leading-relaxed max-w-2xl pl-11">
          {insight}
        </p>
      </div>
      <div className="fade-up">{children}</div>
    </section>
  );
}
