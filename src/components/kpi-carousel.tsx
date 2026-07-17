import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { KPI_VARIANTS, type KpiVariant } from "@/lib/kpi-variants";

export interface KpiItem {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { direction: "up" | "down" | "flat"; pct: string };
  icon: LucideIcon;
  variant?: KpiVariant;
}

export function KpiCarousel({ items }: { items: KpiItem[] }) {
  return (
    <div className="md:hidden">
      <div className="relative">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none">
          {items.map((kpi, i) => {
            const v = KPI_VARIANTS[kpi.variant ?? "primary"];
            return (
              <div
                key={i}
                className={cn(
                  "fade-up snap-start min-w-[220px] flex-1 rounded-lg border p-4 transition-all hover:-translate-y-0.5",
                  v.ring,
                  v.glow,
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      {kpi.label}
                    </div>
                    <div className="num mt-1.5 text-2xl sm:text-3xl font-bold text-foreground leading-tight">{kpi.value}</div>
                    {kpi.trend && (
                      <div className={cn(
                        "mt-1 text-[11px] font-semibold flex items-center gap-0.5",
                        kpi.trend.direction === "up" && "text-emerald-400",
                        kpi.trend.direction === "down" && "text-rose-400",
                        kpi.trend.direction === "flat" && "text-muted-foreground",
                      )}>
                        {kpi.trend.direction === "up" && "▲"}
                        {kpi.trend.direction === "down" && "▼"}
                        {kpi.trend.direction === "flat" && "▬"}
                        {kpi.trend.pct}
                      </div>
                    )}
                    {kpi.hint && (
                      <div className="mt-1 text-[11px] text-muted-foreground">{kpi.hint}</div>
                    )}
                  </div>
                  <div
                    className={cn("flex h-10 w-10 items-center justify-center rounded-lg", v.icon)}
                  >
                    <kpi.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Right-edge fade hint */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-[#082F49] to-transparent" />
      </div>
      {/* Scroll indicators */}
      <div className="mt-2 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all",
              i === 0 ? "h-1.5 w-3 bg-muted-foreground/60" : "h-1.5 w-1.5 bg-muted-foreground/25",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function KpiStrip({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <>
      <KpiCarousel items={items} />
      <KpiGrid items={items} className={className} />
    </>
  );
}

export function KpiGrid({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <div className={cn("hidden md:grid grid-cols-2 gap-3 lg:grid-cols-3", className)}>
      {items.map((kpi, i) => {
        const v = KPI_VARIANTS[kpi.variant ?? "primary"];
        return (
          <div
            key={i}
            className={cn(
              "fade-up rounded-lg border p-4 transition-all hover:-translate-y-0.5",
              v.ring,
              v.glow,
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {kpi.label}
                </div>
                <div className="num mt-1.5 text-2xl sm:text-3xl font-bold text-foreground leading-tight">{kpi.value}</div>
                {kpi.trend && (
                  <div className={cn(
                    "mt-1 text-[11px] font-semibold flex items-center gap-0.5",
                    kpi.trend.direction === "up" && "text-emerald-400",
                    kpi.trend.direction === "down" && "text-rose-400",
                    kpi.trend.direction === "flat" && "text-muted-foreground",
                  )}>
                    {kpi.trend.direction === "up" && "▲"}
                    {kpi.trend.direction === "down" && "▼"}
                    {kpi.trend.direction === "flat" && "▬"}
                    {kpi.trend.pct}
                  </div>
                )}
                {kpi.hint && (
                  <div className="mt-1 text-[11px] text-muted-foreground">{kpi.hint}</div>
                )}
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", v.icon)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
