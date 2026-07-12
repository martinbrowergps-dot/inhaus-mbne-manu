import type { CSSProperties } from "react";
import { formatBRNumber, formatInt } from "@/lib/format";

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: "#0C4A6E",
  border: "1px solid #06B6D455",
  borderRadius: 8,
  fontSize: 12,
  color: "#FFFFFF",
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  padding: "8px 10px",
  fontFamily: "'JetBrains Mono', monospace",
};

export const CHART_LEGEND_STYLE: CSSProperties = {
  fontSize: 11,
  color: "#93C5D8",
  paddingTop: 8,
};

export const CHART_AXIS_TICK = {
  fontSize: 10,
  fill: "#93C5D8",
  fontFamily: "'JetBrains Mono', monospace",
} as const;

export const CHART_LABEL_STYLE = {
  fontSize: 10,
  fill: "#F1F5F9",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 600,
} as const;

export const CHART_GRID_STROKE = "rgba(255,255,255,0.06)";
export const CHART_AXIS_STROKE = "#93C5D8";

export const CHART_CURSOR_STYLE = { stroke: "rgba(6,182,212,0.2)" };
export const CHART_BAR_CURSOR = { fill: "rgba(6,182,212,0.08)" };

// ── Semantic colors (single source of truth across the app) ──
export const STATUS_COLORS: Record<string, string> = {
  Planejado: "#10B981",
  "Não Planejado": "#EF4444",
  Finalizada: "#10B981",
  "Em execução": "#F59E0B",
  Programada: "#06B6D4",
  Cancelada: "#94A3B8",
  Pendente: "#93C5D8",
  Aberto: "#F59E0B",
  Concluído: "#10B981",
};

export const SERIES_COLORS = {
  planejado: "#06B6D4",
  executado: "#10B981",
  meta: "#F59E0B",
  ref: "#F59E0B",
} as const;

export function statusColor(name: string): string {
  return STATUS_COLORS[name] ?? "#93C5D8";
}

// ── Formatters (BR locale) ──
export const brTickFormatter = (v: number | string) => formatInt(Number(v));
export const brHourFormatter = (v: number | string) => `${formatBRNumber(Number(v), 1)}h`;
export const brPercentFormatter = (v: number | string) =>
  `${formatBRNumber(Number(v), 0)}%`;

export function tooltipValueFormatter(v: number, unit?: "int" | "hh" | "pct") {
  if (unit === "hh") return `${formatBRNumber(v, 1)}h`;
  if (unit === "pct") return `${formatBRNumber(v, 0)}%`;
  return formatInt(v);
}

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

export const COLORS = ["#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#F97316", "#A855F7", "#93C5D8"];

export function aggregate<T>(
  items: T[],
  keyFn: (t: T) => string,
): { name: string; value: number }[] {
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
  if (/aberto|pendente/i.test(s)) return "border-warning/40 bg-warning/15 text-warning";
  if (/conclu|finaliz|fechado/i.test(s)) return "border-success/40 bg-success/15 text-success";
  if (/cancel/i.test(s)) return "border-destructive/40 bg-destructive/15 text-destructive";
  if (/em andamento|em exec/i.test(s)) return "border-primary/40 bg-primary/15 text-primary";
  return "border-border/40 bg-card/50 text-muted-foreground";
}
