import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  LabelList,
  ReferenceLine,
} from "recharts";
import {
  SERIES_COLORS,
  CHART_AXIS_TICK,
  brTickFormatter,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
  chartLabelProps,
  tooltipValueFormatter,
} from "@/lib/chart-utils";
import { Empty } from "./empty";

export function ChartBarHorizontal({
  data,
  refLine,
  color = SERIES_COLORS.executado,
  height,
}: {
  data: { name: string; value: number }[];
  refLine?: { value: number; label: string };
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return <Empty />;
  const sorted = [...data].sort((a, b) => a.value - b.value);
  const resolvedHeight = height ?? Math.max(200, sorted.length * 38 + 40);
  return (
    <div style={{ height: resolvedHeight }}>
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ left: 115, right: 40, top: 8, bottom: 4 }}>
          <CartesianGrid {...chartGridProps} horizontal={false} />
          <XAxis type="number" {...chartAxisProps} allowDecimals={false} tickFormatter={brTickFormatter} />
          <YAxis type="category" dataKey="name" {...chartAxisProps} width={110} />
          <Tooltip {...chartTooltipProps} formatter={(v: number) => [tooltipValueFormatter(v, "int"), "Total"]} />
          {refLine && (
            <ReferenceLine
              x={refLine.value}
              stroke={SERIES_COLORS.ref}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: refLine.label,
                position: "top",
                fill: SERIES_COLORS.ref,
                fontSize: 9,
                fontFamily: CHART_AXIS_TICK.fontFamily,
              }}
            />
          )}
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList
              position="right"
              offset={8}
              {...chartLabelProps}
              formatter={(v: number) => (v > 0 ? brTickFormatter(v) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
