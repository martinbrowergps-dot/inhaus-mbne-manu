import type { CSSProperties } from "react";
import { formatBRNumber, formatInt } from "@/lib/format";

// ── Typography (Power BI style: clean sans-serif) ──
export const CHART_FONT = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E1E5EA",
  borderRadius: 4,
  fontSize: 12,
  color: "#1F1F1F",
  boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
  padding: "8px 10px",
  fontFamily: CHART_FONT,
};

export const CHART_LEGEND_STYLE: CSSProperties = {
  fontSize: 11,
  color: "#C7D2DC",
  paddingTop: 8,
  fontFamily: CHART_FONT,
};

export const CHART_AXIS_TICK = {
  fontSize: 10,
  fill: "#93C5D8",
  fontFamily: CHART_FONT,
} as const;

export const CHART_LABEL_STYLE = {
  fontSize: 10,
  fill: "#F1F5F9",
  fontFamily: CHART_FONT,
  fontWeight: 600,
} as const;

export const CHART_GRID_STROKE = "rgba(255,255,255,0.06)";
export const CHART_AXIS_STROKE = "#93C5D8";

export const CHART_CURSOR_STYLE = { stroke: "rgba(148,163,184,0.35)" };
export const CHART_BAR_CURSOR = { fill: "rgba(148,163,184,0.12)" };

// ── Categorical palette (Power BI default 10-color sequence) ──
// Single source of truth for charts with NO inherent semantic meaning
// (sistema, tipo, área, cargo, solicitante, local…).
export const PBI_COLORS = [
  "#01B8AA", // teal
  "#5B9BD5", // blue (substitui o slate escuro #374649, invisível no tema escuro)
  "#FD625E", // coral / red
  "#F2C80F", // yellow
  "#8AD4EB", // light blue
  "#FE9666", // orange
  "#A66999", // purple
  "#3599B8", // blue
  "#DFBFBF", // pink
  "#4AC5BB", // light teal
];

// Alias kept for backward-compatibility with existing imports.
export const COLORS = PBI_COLORS;

// ── Semantic colors (single source of truth across the app) ──
// Used only where the color carries MEANING (status, criticidade).
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
  // Criticidade
  AA: "#EF4444",
  A: "#F97316",
  B: "#F59E0B",
  C: "#10B981",
};

// ── Comparison series colors (Power BI-aligned) ──
export const SERIES_COLORS = {
  planejado: "#01B8AA",
  naoPlanejado: "#FD625E",
  executado: "#3599B8",
  meta: "#F2C80F",
  ref: "#F2C80F",
  hh: "#FE9666",
} as const;

export function statusColor(name: string): string {
  return STATUS_COLORS[name] ?? "";
}

// ── Reusable axis / grid / cursor / label / tooltip prop bundles ──
// Spread into every Recharts chart to keep styling 100% consistent.
export const chartAxisProps = {
  tick: CHART_AXIS_TICK,
  stroke: CHART_AXIS_STROKE,
} as const;

export const chartGridProps = {
  stroke: CHART_GRID_STROKE,
  strokeDasharray: "3 3",
} as const;

export const chartCursorProps = {
  cursor: CHART_CURSOR_STYLE,
} as const;

export const chartTooltipProps = {
  contentStyle: CHART_TOOLTIP_STYLE,
  cursor: CHART_CURSOR_STYLE,
} as const;

export const chartLabelProps = {
  style: CHART_LABEL_STYLE,
} as const;

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

// ── PDF capture readiness ──
// Waits until Recharts surfaces have a non-zero size so html-to-image
// never captures an empty (0px) chart. No-op during SSR / timeout.
export function waitForChartsReady(root?: HTMLElement, timeoutMs = 1500): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }
  const scope = root ?? document;
  const surfaces = Array.from(
    scope.querySelectorAll<HTMLElement>(".recharts-surface"),
  );
  if (surfaces.length === 0) return Promise.resolve();
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const check = () => {
      const pending = surfaces.filter((s) => {
        const r = s.getBoundingClientRect();
        return r.height <= 1 || r.width <= 1;
      });
      if (pending.length === 0 || Date.now() > deadline) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

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

// ── Hierarchical aggregation for treemap ──
export interface HierarchicalNode {
  name: string;
  children?: HierarchicalNode[];
  size?: number;
  totalHH?: number;
  status?: string;
  totalByStatus?: Record<string, number>;
  rawRows?: Record<string, unknown>[];
}

// ── Treemap status colors (industrial palette) ──
export const TREEMAP_COLORS = {
  pendente: "#C62828",
  emAndamento: "#F9A825",
  finalizado: "#2E7D32",
  semStatus: "#9E9E9E",
} as const;

export function treemapStatusColor(status?: string): string {
  if (!status) return TREEMAP_COLORS.semStatus;
  const s = status.toLowerCase();
  if (/pendente|aberto|não iniciado|nao iniciado/i.test(s)) return TREEMAP_COLORS.pendente;
  if (/em andamento|em exec|programada/i.test(s)) return TREEMAP_COLORS.emAndamento;
  if (/finaliz|conclu|fechado/i.test(s)) return TREEMAP_COLORS.finalizado;
  if (/cancel/i.test(s)) return TREEMAP_COLORS.semStatus;
  return TREEMAP_COLORS.semStatus;
}

export function aggregateHierarchy<T>(
  items: T[],
  keys: (keyof T & string)[],
  statusKey?: keyof T & string,
  hhKey?: keyof T & string,
): HierarchicalNode[] {
  if (keys.length === 0) return [];

  function countStatus(rows: T[]): Record<string, number> {
    if (!statusKey) return {};
    const map: Record<string, number> = {};
    for (const row of rows) {
      const s = String(row[statusKey] || "Não informado");
      map[s] = (map[s] ?? 0) + 1;
    }
    return map;
  }

  function dominantStatus(counts: Record<string, number>): string | undefined {
    const entries = Object.entries(counts);
    if (entries.length === 0) return undefined;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  function sumHH(rows: T[]): number {
    if (!hhKey) return 0;
    return rows.reduce((s, r) => s + Number(r[hhKey] ?? 0), 0);
  }

  function buildLevel(rows: T[], levelKeys: (keyof T)[]): HierarchicalNode[] {
    if (levelKeys.length === 0) return [];

    const key = levelKeys[0];
    const remainingKeys = levelKeys.slice(1);
    const groups = new Map<string, T[]>();

    for (const row of rows) {
      const k = String(row[key] || "—");
      const existing = groups.get(k);
      if (existing) {
        existing.push(row);
      } else {
        groups.set(k, [row]);
      }
    }

    const result: HierarchicalNode[] = [];
    for (const [name, groupRows] of groups) {
      const totalByStatus = countStatus(groupRows);
      const status = dominantStatus(totalByStatus);
      const totalHH = sumHH(groupRows);

      if (remainingKeys.length > 0) {
        const children = buildLevel(groupRows, remainingKeys);
        if (children.length > 0) {
          const totalSize = children.reduce((s, c) => s + (c.size ?? 0), 0);
          const totalChildrenHH = children.reduce((s, c) => s + (c.totalHH ?? 0), 0);
          result.push({ name, children, size: totalSize, totalHH: totalChildrenHH, status, totalByStatus });
        }
      } else {
        result.push({
          name,
          size: groupRows.length,
          totalHH,
          status,
          totalByStatus,
          rawRows: groupRows as unknown as Record<string, unknown>[],
        } as HierarchicalNode);
      }
    }

    return result.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  }

  return buildLevel(items, keys);
}

export function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (/aberto|pendente/i.test(s)) return "border-warning/40 bg-warning/15 text-warning";
  if (/conclu|finaliz|fechado/i.test(s)) return "border-success/40 bg-success/15 text-success";
  if (/cancel/i.test(s)) return "border-destructive/40 bg-destructive/15 text-destructive";
  if (/em andamento|em exec/i.test(s)) return "border-primary/40 bg-primary/15 text-primary";
  return "border-border/40 bg-card/50 text-muted-foreground";
}
