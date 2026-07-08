import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { buildSeries, filterByRange, type TempRange } from "@/lib/temperature";
import type { MedicaoRow } from "@/lib/sheets-types";
import { CHART_TOOLTIP_STYLE } from "@/lib/chart-utils";
import { formatBRNumber } from "@/lib/format";

const PALETTE = [
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#A78BFA",
  "#2563EB",
  "#06B6D4",
  "#FBBF24",
];

function fmtX(t: number, range: TempRange): string {
  const d = new Date(t);
  if (range === "24h") return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function TempMultiChart({
  locais,
  medicoes,
  range,
}: {
  locais: string[];
  medicoes: MedicaoRow[];
  range: TempRange;
}) {
  const { data, keys } = useMemo(() => {
    const filtered = filterByRange(medicoes, range);
    const map = new Map<number, Record<string, number>>();
    const usedKeys: string[] = [];
    for (const local of locais) {
      const s = buildSeries(filtered, local);
      if (s.length === 0) continue;
      usedKeys.push(local);
      for (const p of s) {
        const row = map.get(p.t) ?? { t: p.t };
        row[local] = p.temp;
        map.set(p.t, row as Record<string, number>);
      }
    }
    const arr = Array.from(map.values()).sort((a, b) => (a.t as number) - (b.t as number));
    return { data: arr, keys: usedKeys };
  }, [locais, medicoes, range]);

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-muted-foreground">
        Sem leituras nesta janela
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => fmtX(t as number, range)}
            tick={{ fontSize: 10, fill: "#93C5D8" }}
            stroke="#93C5D8"
            minTickGap={40}
          />
          <YAxis tick={{ fontSize: 10, fill: "#93C5D8" }} stroke="#93C5D8" width={44} />
          <ReTooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelFormatter={(t) => new Date(t as number).toLocaleString("pt-BR")}
            formatter={(v: number, name) => [`${formatBRNumber(v, 1)}°C`, name as string]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} iconType="line" />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
