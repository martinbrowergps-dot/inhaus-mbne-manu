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
  Legend,
} from "recharts";
import { Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  classifyLocal,
  computeMultiRangeKpis,
  filterByRange,
  getFaixa,
  buildMultiSeries,
  SENSOR_KEYS,
  type TempRange,
  type SensorKey,
} from "@/lib/temperature";
import type { MedicaoRow } from "@/lib/sheets-types";
import {
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
  CHART_LEGEND_STYLE,
  PBI_COLORS,
} from "@/lib/chart-utils";
import { formatBRNumber } from "@/lib/format";

const SENSOR_LABEL: Record<SensorKey, string> = {
  TEMPERATURA_01: "Sensor 01",
  TEMPERATURA_02: "Sensor 02",
};

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
  const multiSeries = buildMultiSeries(filtered, local);
  const kpis = computeMultiRangeKpis(multiSeries, tipo);

  const allTemps: number[] = [];
  for (const p of multiSeries) {
    for (const sk of SENSOR_KEYS) {
      if (p[sk] !== null) allTemps.push(p[sk]!);
    }
  }
  const minT = faixa ? Math.min(faixa.min - 2, ...allTemps) : Math.min(...allTemps, 0);
  const maxT = faixa ? Math.max(faixa.max + 2, ...allTemps) : Math.max(...allTemps, 1);

  return (
    <div className="panel fade-up rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Thermometer className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate text-xs font-bold tracking-wider uppercase">{local}</span>
        </div>
        {faixa && (
          <span className="num text-[11px] text-muted-foreground">
            {faixa.min}° / {faixa.max}°C
          </span>
        )}
      </div>

      {multiSeries.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
          Sem leituras nesta janela
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer>
            <LineChart data={multiSeries} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t) => fmtX(t as number, range)}
                {...chartAxisProps}
                minTickGap={30}
              />
              <YAxis
                domain={[minT, maxT]}
                {...chartAxisProps}
                width={44}
                tickFormatter={(v) => `${Math.round(Number(v))}°`}
              />
              {faixa && (
                <ReferenceArea
                  y1={faixa.min}
                  y2={faixa.max}
                  fill="#10B981"
                  fillOpacity={0.08}
                  stroke="#10B981"
                  strokeOpacity={0.25}
                />
              )}
              {faixa && (
                <>
                  <ReferenceLine y={faixa.min} stroke="rgba(34,197,94,0.5)" strokeDasharray="3 3" />
                  <ReferenceLine y={faixa.max} stroke="rgba(34,197,94,0.5)" strokeDasharray="3 3" />
                </>
              )}
              <ReTooltip
                {...chartTooltipProps}
                labelFormatter={(t) => new Date(t as number).toLocaleString("pt-BR")}
                formatter={(v: number, name: string) => {
                  const sk = name as SensorKey;
                  const label = SENSOR_LABEL[sk] ?? sk;
                  return [`${formatBRNumber(v, 1)}°C`, label];
                }}
              />
              <Legend
                wrapperStyle={CHART_LEGEND_STYLE}
                iconType="line"
                formatter={(value: string) => {
                  const sk = value as SensorKey;
                  return SENSOR_LABEL[sk] ?? sk;
                }}
              />
              {SENSOR_KEYS.map((sk, i) => (
                <Line
                  key={sk}
                  type="monotone"
                  dataKey={sk}
                  stroke={PBI_COLORS[i % PBI_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-border/40 pt-2 text-center">
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
