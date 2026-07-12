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

export function ChartDonut({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <Empty />;
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Pie
            data={sorted}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            labelLine={false}
            label={({ value, percent }) => {
              const pct = Math.round((percent ?? 0) * 100);
              if (pct < 6) return "";
              return `${formatInt(Number(value))}`;
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
