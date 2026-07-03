import type { CSSProperties } from "react";

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: "#05254A",
  border: "1px solid #0EA5FF55",
  borderRadius: 8,
  fontSize: 12,
  color: "#FFFFFF",
};

export const CHART_LEGEND_STYLE: CSSProperties = {
  fontSize: 11,
  color: "#A8B8CC",
};

export const CHART_CURSOR_STYLE = { stroke: "rgba(14,165,255,0.2)" };

export function priorityColor(priority: string): string {
  const p = (priority || "").toLowerCase();
  if (/alta|crit|urgent|aa/i.test(p)) return "#EF4444";
  if (/m[ée]dia/i.test(p)) return "#EAB308";
  if (/baixa/i.test(p)) return "#22C55E";
  return "#94A3B8";
}

export function priorityBadge(priority: string) {
  const color = priorityColor(priority);
  const cls =
    color === "#EF4444"
      ? "border-destructive/40 bg-destructive/15 text-destructive"
      : color === "#EAB308"
        ? "border-warning/40 bg-warning/15 text-warning"
        : color === "#22C55E"
          ? "border-success/40 bg-success/15 text-success"
          : "border-border/40 bg-card/50 text-muted-foreground";
  return cls;
}

export function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (/aberto|pendente/i.test(s))
    return "border-warning/40 bg-warning/15 text-warning";
  if (/conclu|finaliz|fechado/i.test(s))
    return "border-success/40 bg-success/15 text-success";
  if (/cancel/i.test(s))
    return "border-destructive/40 bg-destructive/15 text-destructive";
  if (/em andamento|em exec/i.test(s))
    return "border-primary/40 bg-primary/15 text-primary";
  return "border-border/40 bg-card/50 text-muted-foreground";
}
