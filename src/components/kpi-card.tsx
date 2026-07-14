import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { KPI_VARIANTS, type KpiVariant } from "@/lib/kpi-variants";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = "primary",
  glass,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  variant?: KpiVariant;
  glass?: boolean;
}) {
  const v = KPI_VARIANTS[variant];
  return (
    <div
      className={cn(
        "fade-up rounded-xl border p-5 transition-all hover:-translate-y-0.5",
        glass ? "panel-glass" : "panel",
        v.ring,
        v.glow,
      )}
    >
      <div className={cn("flex items-start justify-between gap-6", !Icon && "items-center")}>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {label}
          </div>
          <div className="num mt-2 text-2xl sm:text-3xl font-bold text-foreground leading-tight">{value}</div>
          {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", v.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
