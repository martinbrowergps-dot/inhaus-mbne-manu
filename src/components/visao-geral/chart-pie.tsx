import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  COLORS,
  CHART_LEGEND_STYLE,
  CHART_FONT,
  chartTooltipProps,
  statusColor,
  tooltipValueFormatter,
} from "@/lib/chart-utils";
import { formatInt } from "@/lib/format";
import { Empty } from "./empty";

export function ChartPie({
  data,
  colors = COLORS,
}: {
  data: { name: string; value: number }[];
  colors?: string[];
}) {
  if (data.length === 0) return <Empty />;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={sorted}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={75}
            labelLine={false}
            isAnimationActive={false}
            label={({ x, y, value, percent }) => {
              const pct = Math.round((percent ?? Number(value) / total) * 100);
              if (pct < 5) return "";
              return (
                <text
                  x={x}
                  y={y}
                  fill="#F1F5F9"
                  fontSize={10}
                  fontFamily={CHART_FONT}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {`${formatInt(Number(value))} · ${pct}%`}
                </text>
              );
            }}
          >
            {sorted.map((d, i) => (
              <Cell key={i} fill={statusColor(d.name) || colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            {...chartTooltipProps}
            formatter={(v: number, name) => [tooltipValueFormatter(v, "int"), name as string]}
          />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="square" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
