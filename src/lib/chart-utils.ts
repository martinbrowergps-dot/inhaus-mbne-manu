import type { CSSProperties } from "react";

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: "#0C4A6E",
  border: "1px solid #06B6D455",
  borderRadius: 8,
  fontSize: 12,
  color: "#FFFFFF",
};

export const CHART_LEGEND_STYLE: CSSProperties = {
  fontSize: 11,
  color: "#93C5D8",
};

export const CHART_CURSOR_STYLE = { stroke: "rgba(6,182,212,0.2)" };

export function priorityColor(priority: string): string {
  const p = (priority || "").toLowerCase();
  if (/alta|crit|urgent|aa/i.test(p)) return "#EF4444";
  if (/m[ée]dia/i.test(p)) return "#F59E0B";
  if (/baixa/i.test(p)) return "#10B981";
  return "#93C5D8";
}

export function priorityBadge(priority: string) {
  const color = priorityColor(priority);
  const cls =
    color === "#EF4444"
      ? "border-destructive/40 bg-destructive/15 text-destructive"
      : color === "#F59E0B"
        ? "border-warning/40 bg-warning/15 text-warning"
        : color === "#10B981"
          ? "border-success/40 bg-success/15 text-success"
          : "border-border/40 bg-card/50 text-muted-foreground";
  return cls;
}

export const COLORS = ["#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#93C5D8"];

export function aggregate<T>(items: T[], keyFn: (t: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it) || "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
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
