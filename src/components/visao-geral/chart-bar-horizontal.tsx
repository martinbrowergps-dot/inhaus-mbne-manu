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
  CHART_TOOLTIP_STYLE,
  CHART_AXIS_TICK,
  CHART_AXIS_STROKE,
  CHART_GRID_STROKE,
  CHART_BAR_CURSOR,
  CHART_LABEL_STYLE,
  SERIES_COLORS,
  brTickFormatter,
  tooltipValueFormatter,
} from "@/lib/chart-utils";
import { Empty } from "./empty";

export function ChartBarHorizontal({
  data,
  refLine,
}: {
  data: { name: string; value: number }[];
  refLine?: { value: number; label: string };
}) {
  if (data.length === 0) return <Empty />;
  const sorted = [...data].sort((a, b) => a.value - b.value);
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ left: 115, right: 40, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} horizontal={false} />
          <XAxis
            type="number"
            tick={CHART_AXIS_TICK}
            stroke={CHART_AXIS_STROKE}
            allowDecimals={false}
            tickFormatter={brTickFormatter}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={CHART_AXIS_TICK}
            stroke={CHART_AXIS_STROKE}
            width={110}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            cursor={CHART_BAR_CURSOR}
            formatter={(v: number) => [tooltipValueFormatter(v, "int"), "Total"]}
          />
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
              }}
            />
          )}
          <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]}>
            <LabelList
              position="right"
              offset={8}
              style={CHART_LABEL_STYLE}
              formatter={(v: number) => (v > 0 ? brTickFormatter(v) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
