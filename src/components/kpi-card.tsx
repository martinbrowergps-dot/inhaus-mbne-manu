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
        "fade-up rounded-lg border p-5 transition-colors",
        glass ? "panel-glass" : "panel",
        v.ring,
        v.glow,
      )}
    >
      <div className={cn("flex items-start justify-between gap-6", !Icon && "items-center")}>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground">
            {label}
          </div>
          <div className="num mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{value}</div>
          {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", v.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
