export type KpiVariant = "primary" | "success" | "warning" | "danger" | "neutral";

export const KPI_VARIANTS: Record<
  KpiVariant,
  { ring: string; icon: string; glow: string }
> = {
  primary: {
    ring: "border-primary/30",
    icon: "bg-primary/15 text-primary",
    glow: "shadow-[0_0_24px_rgba(6,182,212,0.18)]",
  },
  success: {
    ring: "border-success/30",
    icon: "bg-success/15 text-success",
    glow: "shadow-[0_0_24px_rgba(16,185,129,0.18)]",
  },
  warning: {
    ring: "border-warning/30",
    icon: "bg-warning/15 text-warning",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.18)]",
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
