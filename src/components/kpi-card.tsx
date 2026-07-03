import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "success" | "warning" | "danger" | "neutral";

const VARIANTS: Record<Variant, { ring: string; icon: string; glow: string }> = {
  primary: {
    ring: "border-primary/30",
    icon: "bg-primary/15 text-primary",
    glow: "shadow-[0_0_24px_rgba(14,165,255,0.18)]",
  },
  success: {
    ring: "border-success/30",
    icon: "bg-success/15 text-success",
    glow: "shadow-[0_0_24px_rgba(34,197,94,0.18)]",
  },
  warning: {
    ring: "border-warning/30",
    icon: "bg-warning/15 text-warning",
    glow: "shadow-[0_0_24px_rgba(234,179,8,0.18)]",
  },
  danger: {
    ring: "border-destructive/40",
    icon: "bg-destructive/15 text-destructive",
    glow: "shadow-[0_0_24px_rgba(239,68,68,0.22)]",
  },
  neutral: {
    ring: "border-border/60",
    icon: "bg-accent text-foreground",
    glow: "",
  },
};

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
  icon: LucideIcon;
  variant?: Variant;
  glass?: boolean;
}) {
  const v = VARIANTS[variant];
  return (
    <div
      className={cn(
        "fade-up rounded-xl border p-4 transition-all hover:-translate-y-0.5",
        glass ? "panel-glass" : "panel",
        v.ring,
        v.glow,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {label}
          </div>
          <div className="num mt-1.5 text-3xl font-bold text-foreground">{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", v.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
