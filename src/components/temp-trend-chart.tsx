import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildSeries,
  classifyLocal,
  computeRangeKpis,
  filterByRange,
  getFaixa,
  type TempRange,
} from "@/lib/temperature";
import type { MedicaoRow } from "@/lib/sheets-types";
import { formatBRNumber } from "@/lib/format";

function fmtX(t: number, range: TempRange): string {
  const d = new Date(t);
  if (range === "24h") return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function TempTrendChart({
  local,
  medicoes,
  range,
}: {
  local: string;
  medicoes: MedicaoRow[];
  range: TempRange;
}) {
  const tipo = classifyLocal(local);
  const faixa = getFaixa(tipo);
  const filtered = filterByRange(medicoes, range);
  const series = buildSeries(filtered, local, tipo);
  const kpis = computeRangeKpis(series, faixa);

  const lineColor =
    kpis.criticos > 0
      ? "#EF4444"
      : kpis.pctNaFaixa < 100
        ? "#EAB308"
        : "#22C55E";

  const temps = series.map((s) => s.temp);
  const minT = faixa ? Math.min(faixa.min - 2, ...temps) : Math.min(...temps, 0);
  const maxT = faixa ? Math.max(faixa.max + 2, ...temps) : Math.max(...temps, 1);

  return (
    <div className="panel fade-up rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Thermometer className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate text-xs font-bold tracking-wider uppercase">{local}</span>
        </div>
        {faixa && (
          <span className="num text-[10px] text-muted-foreground">
            {faixa.min}° / {faixa.max}°C
          </span>
        )}
      </div>

      {series.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
          Sem leituras nesta janela
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t) => fmtX(t as number, range)}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                stroke="#94A3B8"
                minTickGap={30}
              />
              <YAxis
                domain={[minT, maxT]}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                stroke="#94A3B8"
                width={36}
              />
              {faixa && (
                <ReferenceArea
                  y1={faixa.min}
                  y2={faixa.max}
                  fill="#22C55E"
                  fillOpacity={0.08}
                  stroke="#22C55E"
                  strokeOpacity={0.25}
                />
              )}
              {faixa && (
                <>
                  <ReferenceLine
                    y={faixa.min}
                    stroke="rgba(34,197,94,0.5)"
                    strokeDasharray="3 3"
                  />
                  <ReferenceLine
                    y={faixa.max}
                    stroke="rgba(34,197,94,0.5)"
                    strokeDasharray="3 3"
                  />
                </>
              )}
              <ReTooltip
                contentStyle={{
                  background: "#05254A",
                  border: "1px solid #0EA5FF55",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(t) => new Date(t as number).toLocaleString("pt-BR")}
                formatter={(v: number) => [`${formatBRNumber(v, 1)}°C`, "Temperatura"]}
              />
              <Line
                type="monotone"
                dataKey="temp"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border/40 pt-2 text-center">
        <Kpi label="Leituras" value={String(kpis.count)} />
        <Kpi
          label="Na faixa"
          value={`${formatBRNumber(kpis.pctNaFaixa, 0)}%`}
          tone={kpis.pctNaFaixa >= 95 ? "good" : kpis.pctNaFaixa >= 85 ? "warn" : "bad"}
        />
        <Kpi
          label="Críticos"
          value={String(kpis.criticos)}
          tone={kpis.criticos > 0 ? "bad" : "good"}
        />
        <Kpi
          label="Desv. máx"
          value={`${formatBRNumber(kpis.desvioMax, 1)}°`}
          tone={kpis.desvioMax > 1 ? "bad" : kpis.desvioMax > 0 ? "warn" : "good"}
        />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const cls = {
    good: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
    neutral: "text-foreground",
  }[tone];
  return (
    <div>
      <div className="text-[9px] tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className={cn("num text-xs font-bold", cls)}>{value}</div>
    </div>
  );
}
