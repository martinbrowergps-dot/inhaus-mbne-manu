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
        "fade-up rounded-xl border p-4 transition-all hover:-translate-y-0.5",
        glass ? "panel-glass" : "panel",
        v.ring,
        v.glow,
      )}
    >
      <div className={cn("flex items-start justify-between gap-3", !Icon && "items-center")}>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {label}
          </div>
          <div className="num mt-1.5 text-2xl sm:text-3xl font-bold text-foreground leading-tight">{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", v.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
