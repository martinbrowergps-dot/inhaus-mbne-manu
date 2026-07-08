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
import { CHART_TOOLTIP_STYLE } from "@/lib/chart-utils";
import { Empty } from "./empty";

export function ChartBarHorizontal({
  data,
  refLine,
}: {
  data: { name: string; value: number }[];
  refLine?: { value: number; label: string };
}) {
  if (data.length === 0) return <Empty />;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 115, right: 40, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#93C5D8" }} stroke="#93C5D8" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "#93C5D8" }}
            stroke="#93C5D8"
            width={110}
          />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          {refLine && (
            <ReferenceLine
              x={refLine.value}
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: refLine.label,
                position: "top",
                fill: "#F59E0B",
                fontSize: 9,
              }}
            />
          )}
<Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]}>
            <LabelList position="right" fill="#fff" fontSize={10} offset={8} formatter={(v: number) => v > 0 ? v : ""} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
