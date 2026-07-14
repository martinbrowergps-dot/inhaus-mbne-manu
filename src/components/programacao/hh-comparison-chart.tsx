import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { Panel } from "@/components/panel";
import { formatBRNumber, parseBRDate } from "@/lib/format";
import {
  CHART_LEGEND_STYLE,
  SERIES_COLORS,
  brHourFormatter,
  tooltipValueFormatter,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
  chartLabelProps,
} from "@/lib/chart-utils";
import type { EnrichedRow } from "./types";

export function HhComparisonChart({ rows }: { rows: EnrichedRow[] }) {
  const chartByDay = useMemo(() => {
    const map = new Map<string, { planejado: number; executado: number }>();
    rows.forEach((r) => {
      const d = parseBRDate(r.DataProgramada);
      if (!d) return;
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const e = map.get(label) ?? { planejado: 0, executado: 0 };
      e.planejado += r.HH || 0;
      if (r.StatusExecucao === "Finalizada") {
        e.executado += r.TempoRealExec ?? 0;
      }
      map.set(label, e);
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => {
        const [da, ma] = a.label.split("/").map(Number);
        const [db, mb] = b.label.split("/").map(Number);
        return ma - mb || da - db;
      });
  }, [rows]);

  const totalPlan = chartByDay.reduce((s, d) => s + d.planejado, 0);
  const totalExec = chartByDay.reduce((s, d) => s + d.executado, 0);

  if (rows.length === 0) return null;

  const labelMap: Record<string, string> = {
    planejado: "Planejado",
    executado: "Executado",
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="HH PLANEJADO vs EXECUTADO" subtitle="Total agregado">
        <div className="flex items-end gap-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Planejado</p>
            <p className="num text-3xl font-bold text-foreground">
              {formatBRNumber(totalPlan, 1)}
              <span className="ml-0.5 text-sm text-muted-foreground">h</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-success">Executado</p>
            <p className="num text-3xl font-bold text-foreground">
              {formatBRNumber(totalExec, 1)}
              <span className="ml-0.5 text-sm text-muted-foreground">h</span>
            </p>
          </div>
          {totalPlan > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Aproveitamento
              </p>
              <p className="num text-3xl font-bold text-foreground">
                {formatBRNumber((totalExec / totalPlan) * 100, 0)}
                <span className="ml-0.5 text-sm text-muted-foreground">%</span>
              </p>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="HH PLANEJADO vs EXECUTADO" subtitle="Por dia · horas">
        {chartByDay.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            Sem dados no período
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={chartByDay} margin={{ top: 24, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="label" {...chartAxisProps} />
                <YAxis
                  {...chartAxisProps}
                  tickFormatter={(v) => `${Math.round(Number(v))}h`}
                />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(v: number, name) => [
                    tooltipValueFormatter(v, "hh"),
                    labelMap[name as string] ?? name,
                  ]}
                />
                <Legend
                  wrapperStyle={CHART_LEGEND_STYLE}
                  iconType="square"
                  formatter={(value) => labelMap[value as string] ?? value}
                />
                <Bar
                  dataKey="planejado"
                  name="planejado"
                  fill={SERIES_COLORS.planejado}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    position="top"
                    offset={6}
                    {...chartLabelProps}
                    formatter={(v: number) => (v > 0 ? brHourFormatter(v) : "")}
                  />
                </Bar>
                <Bar
                  dataKey="executado"
                  name="executado"
                  fill={SERIES_COLORS.executado}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    position="top"
                    offset={6}
                    {...chartLabelProps}
                    formatter={(v: number) => (v > 0 ? brHourFormatter(v) : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}
