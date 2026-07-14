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

export function ChartDonut({
  data,
  colors = COLORS,
}: {
  data: { name: string; value: number }[];
  colors?: string[];
}) {
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
            isAnimationActive={false}
            label={({ x, y, value, percent }) => {
              const pct = Math.round((percent ?? 0) * 100);
              if (pct < 6) return "";
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
                  {`${formatInt(Number(value))}`}
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
