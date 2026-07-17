import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import {
  COLORS,
  CHART_LEGEND_STYLE,
  CHART_FONT,
  chartTooltipProps,
  chartAxisProps,
  chartGridProps,
  statusColor,
  tooltipValueFormatter,
  SERIES_COLORS,
} from "@/lib/chart-utils";
import { formatInt } from "@/lib/format";
import { Empty } from "./empty";

export function ChartDonut({
  data,
  colors = COLORS,
  onCellClick,
}: {
  data: { name: string; value: number }[];
  colors?: string[];
  onCellClick?: (name: string) => void;
}) {
  if (data.length === 0) return <Empty />;
  const sorted = [...data].sort((a, b) => b.value - a.value);

  // Use donut for ≤3 categories, horizontal bar for 4+
  if (sorted.length > 3) {
    return (
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={sorted} layout="vertical" margin={{ left: 20, right: 40, top: 8, bottom: 4 }}>
            <CartesianGrid {...chartGridProps} horizontal={false} />
            <XAxis type="number" {...chartAxisProps} allowDecimals={false} />
            <YAxis type="category" dataKey="name" {...chartAxisProps} width={120} />
            <Tooltip
              {...chartTooltipProps}
              formatter={(v: number, name) => [tooltipValueFormatter(v, "int"), name as string]}
            />
            <Bar dataKey="value" fill={SERIES_COLORS.executado} radius={[0, 4, 4, 0]} isAnimationActive={false} onClick={(d: { name?: string }) => onCellClick?.(d.name ?? "")} style={{ cursor: onCellClick ? "pointer" : undefined }}>
              <LabelList dataKey="value" position="right" fill="#F1F5F9" fontSize={10} offset={6} formatter={(v: number) => formatInt(Number(v))} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

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
            onClick={(d: { name?: string }) => onCellClick?.(d.name ?? "")}
            style={{ cursor: onCellClick ? "pointer" : undefined }}
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
