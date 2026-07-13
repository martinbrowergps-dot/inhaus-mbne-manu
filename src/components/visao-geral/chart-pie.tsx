import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_LEGEND_STYLE,
  statusColor,
  tooltipValueFormatter,
} from "@/lib/chart-utils";
import { formatInt } from "@/lib/format";
import { Empty } from "./empty";

export function ChartPie({ data }: { data: { name: string; value: number }[] }) {
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
            label={({ value, percent }) => {
              const pct = Math.round((percent ?? Number(value) / total) * 100);
              if (pct < 5) return "";
              return `${formatInt(Number(value))} · ${pct}%`;
            }}
          >
            {sorted.map((d, i) => (
              <Cell key={i} fill={statusColor(d.name) || COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(v: number, name) => [tooltipValueFormatter(v, "int"), name as string]}
          />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="square" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
