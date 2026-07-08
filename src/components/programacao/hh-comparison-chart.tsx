import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { Panel } from "@/components/panel";
import { formatBRNumber, parseBRDate } from "@/lib/format";
import { CHART_TOOLTIP_STYLE } from "@/lib/chart-utils";
import type { EnrichedRow } from "./types";

const HH_COLORS = ["#06B6D4", "#10B981"];

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

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="HH PLANEJADO vs EXECUTADO" subtitle="Total agregado">
        <div className="flex items-end gap-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Planejado</p>
            <p className="num text-3xl font-bold text-foreground">{formatBRNumber(totalPlan, 1)}<span className="ml-0.5 text-sm text-muted-foreground">h</span></p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-success">Executado</p>
            <p className="num text-3xl font-bold text-foreground">{formatBRNumber(totalExec, 1)}<span className="ml-0.5 text-sm text-muted-foreground">h</span></p>
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

      <Panel title="HH PLANEJADO vs EXECUTADO" subtitle="Por dia">
        {chartByDay.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            Sem dados no período
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={chartByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#93C5D8" }} stroke="#93C5D8" />
                <YAxis tick={{ fontSize: 10, fill: "#93C5D8" }} stroke="#93C5D8" />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => (value === "planejado" ? "Planejado" : "Executado")}
                />
                <Bar dataKey="planejado" name="planejado" fill={HH_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="executado" name="executado" fill={HH_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}
